-- KALESH.EXE migration 002 — content pipeline (tweet snapshots, KALESH DESK, ingest, Apify watchlist).
-- Run AFTER supabase-schema.sql (and 001 if present). Safe to re-run: everything is idempotent.
-- Writes to the pipeline tables happen only from Edge Functions with the service_role key.

-- ───────────────────────── controversies: text-only posts, source, side ─────────────────────────
-- Drop the table-level "x_url or image_url required" check (its auto-generated name varies), so text-only posts work.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.controversies'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%x_url IS NOT NULL%image_url IS NOT NULL%'
  loop
    execute format('alter table public.controversies drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.controversies add column if not exists source text not null default 'user';
alter table public.controversies add column if not exists side text;          -- gang a desk/apify post is filed under (user posts use the author's gang)
alter table public.controversies add column if not exists source_ref text;    -- sheet row / apify run id, for tracing
alter table public.controversies add column if not exists reviewed_at timestamptz; -- last time a moderator (re)published it
do $$ begin
  alter table public.controversies add constraint controversies_source_check check (source in ('user','desk','apify'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.controversies add constraint controversies_side_check check (side is null or side in ('balaks','bataks'));
exception when duplicate_object then null; end $$;
create index if not exists controversies_source_idx on public.controversies(source, created_at desc);

-- Browser users can never claim to be the desk/apify or pick a side/review time: force those columns on user writes.
create or replace function public.guard_post_source() returns trigger language plpgsql set search_path = '' as $$
declare r text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '');
begin
  if r in ('anon','authenticated') then
    new.source := 'user'; new.side := null; new.source_ref := null; new.reviewed_at := null;
  end if;
  return new;
end $$;
drop trigger if exists controversies_source_guard on public.controversies;
-- Trigger name sorts before "submission_limit", so the limit sees the forced source.
create trigger controversies_source_guard before insert on public.controversies for each row execute function public.guard_post_source();

-- The 10/day anti-spam limit applies to people, not to the desk.
create or replace function public.limit_submissions() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source <> 'user' then return new; end if;
  if (select count(*) from public.controversies where user_id = new.user_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Bhai bas kar. 10 kalesh per day limit.';
  end if;
  return new;
end $$;

-- ───────────────────────── KALESH DESK system profile ─────────────────────────
-- profiles.id references auth.users, so the desk gets a login-less auth user (empty password, cannot sign in).
create or replace function public.kalesh_desk_id() returns uuid language sql immutable as $$ select '00000000-0000-4000-a000-00000000d35c'::uuid $$;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user)
values (public.kalesh_desk_id(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'desk@kalesh-exe.invalid', '', now(),
        '{"provider":"system","providers":[]}'::jsonb, '{"username":"kalesh_desk","system":true}'::jsonb, now(), now(), false)
on conflict (id) do nothing;

insert into public.profiles (id, handle, avatar_emoji, title, bio)
values (public.kalesh_desk_id(), 'kalesh_desk', '📡', 'KALESH DESK', 'Automated news desk. Pulls the timeline''s kalesh so you don''t have to.')
on conflict (id) do update set handle = excluded.handle, avatar_emoji = excluded.avatar_emoji, title = excluded.title, bio = excluded.bio;

-- ───────────────────────── post_tweets: snapshots of the linked X posts ─────────────────────────
-- One row per tweet; a post with several rows is a thread (ordered by position).
-- The snapshot survives if the tweet is deleted. Media URLs point at X's CDN (hotlinked, not re-hosted).
create table if not exists public.post_tweets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.controversies(id) on delete cascade,
  position smallint not null default 0 check (position between 0 and 49),
  tweet_id text not null unique check (tweet_id ~ '^[0-9]{1,25}$'),
  url text not null check (url ~* '^https://(x|twitter)\.com/'),
  author_handle text check (author_handle ~ '^[A-Za-z0-9_]{1,15}$'),
  author_name text check (char_length(author_name) <= 100),
  author_avatar text check (author_avatar is null or author_avatar ~* '^https://(pbs|abs)\.twimg\.com/'),
  text text not null default '' check (char_length(text) <= 4000),
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array'),   -- [{type:'photo'|'video'|'gif', url, thumb, w, h}]
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'), -- {likes, retweets, replies, quotes, views, bookmarks}
  snapshot_source text not null default 'fxtwitter' check (snapshot_source in ('fxtwitter','oembed','apify','manual')),
  tweeted_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (post_id, position)
);
create index if not exists post_tweets_post_idx on public.post_tweets(post_id, position);

-- ───────────────────────── ingest_log: every row the pipeline saw ─────────────────────────
create table if not exists public.ingest_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  channel text not null check (channel in ('sheet','apify','manual','unfurl')),
  ref text,                       -- sheet row number, apify run id, …
  url text,
  tweet_id text,
  post_id uuid references public.controversies(id) on delete set null,
  outcome text not null check (outcome in ('published','pending','duplicate','skipped','error')),
  message text,
  payload jsonb
);
create index if not exists ingest_log_created_idx on public.ingest_log(created_at desc);
create index if not exists ingest_log_tweet_idx on public.ingest_log(tweet_id);

-- ───────────────────────── watchlist: what Apify scrapes ─────────────────────────
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('account','search')),
  value text not null check (char_length(value) between 1 and 200),   -- X handle without @, or a search query (X advanced search syntax ok)
  side text check (side is null or side in ('balaks','bataks')),
  tags text[] not null default '{}' check (cardinality(tags) <= 5),
  min_engagement integer check (min_engagement is null or min_engagement >= 0), -- overrides APIFY_MIN_ENGAGEMENT for this row
  active boolean not null default true,
  note text,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, value)
);

-- ───────────────────────── reports auto-hide ─────────────────────────
-- 3+ reports since the last moderator review sends a published post back to pending.
create or replace function public.auto_hide_reported() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.controversies c set status = 'pending'
  where c.id = new.post_id and c.status = 'published'
    and (select count(*) from public.reports r
         where r.post_id = new.post_id and r.created_at > coalesce(c.reviewed_at, '-infinity'::timestamptz)) >= 3;
  return new;
end $$;
drop trigger if exists reports_auto_hide on public.reports;
create trigger reports_auto_hide after insert on public.reports for each row execute function public.auto_hide_reported();

-- Re-publishing a post (pending → published) starts a fresh report count.
create or replace function public.stamp_review() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then new.reviewed_at := now(); end if;
  return new;
end $$;
drop trigger if exists controversies_stamp_review on public.controversies;
create trigger controversies_stamp_review before update of status on public.controversies for each row execute function public.stamp_review();

-- ───────────────────────── realtime ─────────────────────────
-- Realtime respects RLS, so clients only receive published posts (and their own).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'controversies') then
    alter publication supabase_realtime add table public.controversies;
  end if;
end $$;

-- ───────────────────────── privileges + RLS ─────────────────────────
alter table public.post_tweets enable row level security;
alter table public.ingest_log enable row level security;
alter table public.watchlist enable row level security;

-- Only the service role (Edge Functions) writes pipeline tables. service_role bypasses RLS.
revoke insert, update, delete on public.post_tweets, public.ingest_log, public.watchlist from anon, authenticated;
revoke select on public.ingest_log, public.watchlist from anon;

drop policy if exists "snapshots of visible posts" on public.post_tweets;
create policy "snapshots of visible posts" on public.post_tweets for select to anon, authenticated
  using (exists (select 1 from public.controversies p where p.id = post_id and (p.status = 'published' or p.user_id = auth.uid())));

drop policy if exists "admins read ingest log" on public.ingest_log;
create policy "admins read ingest log" on public.ingest_log for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "admins read watchlist" on public.watchlist;
create policy "admins read watchlist" on public.watchlist for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- ───────────────────────── cheat-sheet (run manually) ─────────────────────────
-- Watch an account:      insert into public.watchlist (kind, value, side, tags) values ('account', 'some_handle', 'balaks', '{tech}');
-- Watch a search:        insert into public.watchlist (kind, value, min_engagement) values ('search', '"bengaluru traffic" lang:en', 2000);
-- Pipeline health:       select created_at, channel, outcome, url, message from public.ingest_log order by id desc limit 50;
-- Approve apify pending: update public.controversies set status = 'published' where source = 'apify' and status = 'pending' and id = '...';
-- Schedule apify-sync every 30 min with pg_cron + pg_net: see README "Content pipeline".
