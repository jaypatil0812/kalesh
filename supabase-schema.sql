-- KALESH.EXE database v2. Run ONCE in the Supabase SQL editor of a NEW project.
-- Browser uses only the public anon key; Row Level Security + column grants are the security boundary.
create extension if not exists pgcrypto;

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique check (handle ~ '^[a-z0-9_]{3,20}$'),          -- custom site handle, set once via claim_handle()
  x_username text,                                                  -- VERIFIED: copied from X login only (server side)
  x_claimed text check (x_claimed ~ '^[A-Za-z0-9_]{1,15}$'),        -- self-reported X handle for email users (shown as unverified)
  gang text check (gang in ('balaks','bataks')),
  avatar_emoji text not null default '🐈' check (char_length(avatar_emoji) <= 16),
  avatar_url text,
  title text check (char_length(title) <= 60),                      -- admin-assigned title, overrides the points ladder
  bio text check (char_length(bio) <= 160),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists profiles_gang_idx on public.profiles(gang);
create index if not exists profiles_x_idx on public.profiles(lower(x_username));

-- Handles reserved for specific X accounts (VIP / marketing profiles). Only that X account can claim it.
create table if not exists public.reserved_handles (
  handle text primary key check (handle ~ '^[a-z0-9_]{3,20}$'),
  x_username text not null,
  display_name text,
  title text check (char_length(title) <= 60),
  bio text check (char_length(bio) <= 160),
  avatar_emoji text default '👑',
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists reserved_x_unique on public.reserved_handles(lower(x_username));

-- Gang choice is permanent.
create or replace function public.prevent_gang_switch() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.gang is not null and new.gang is distinct from old.gang then raise exception 'Gang choice is permanent'; end if;
  return new;
end $$;
drop trigger if exists preserve_gang on public.profiles;
create trigger preserve_gang before update on public.profiles for each row execute function public.prevent_gang_switch();

-- Create a profile for every new auth user. X username is taken from the provider only when the
-- account was created through X (raw_app_meta_data is not user-editable).
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, x_username)
  values (new.id,
    case when new.raw_app_meta_data->>'provider' in ('twitter','x')
      then nullif(coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'preferred_username'), '') end)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Verified X username straight from the linked X identity.
create or replace function public.verified_x_username(uid uuid) returns text language sql stable security definer set search_path = '' as $$
  select nullif(coalesce(identity_data->>'user_name', identity_data->>'preferred_username'), '')
  from auth.identities where user_id = uid and provider in ('twitter','x') order by created_at limit 1
$$;
revoke execute on function public.verified_x_username(uuid) from public, anon, authenticated;

-- Pick a site handle (once). Reserved handles only go to their X owner.
create or replace function public.claim_handle(p_handle text, p_x_claimed text default null)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  h text := lower(trim(p_handle));
  xu text;
  r public.reserved_handles%rowtype;
  result public.profiles%rowtype;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if h !~ '^[a-z0-9_]{3,20}$' then raise exception 'Handle must be 3-20 chars: a-z 0-9 _'; end if;
  if h in ('admin','administrator','kalesh','kaleshexe','mod','moderator','root','support','system','official','null','undefined') then raise exception 'Ye handle sarkar ne reserve kiya hai'; end if;
  if (select handle from public.profiles where id = me) is not null then raise exception 'Handle already set'; end if;
  if exists (select 1 from public.profiles where handle = h and id <> me) then raise exception 'Handle already taken'; end if;
  xu := public.verified_x_username(me);
  select * into r from public.reserved_handles where handle = h and claimed_by is null;
  if found and (xu is null or lower(r.x_username) <> lower(xu)) then raise exception 'Ye handle @% ke liye reserved hai', r.x_username; end if;
  update public.profiles set
    handle = h,
    x_username = coalesce(xu, x_username),
    x_claimed = case when xu is null then nullif(trim(leading '@' from coalesce(p_x_claimed, '')), '') else null end,
    title = coalesce(title, r.title),
    bio = coalesce(bio, r.bio),
    avatar_emoji = coalesce(r.avatar_emoji, avatar_emoji)
  where id = me returning * into result;
  if r.handle is not null then update public.reserved_handles set claimed_by = me, claimed_at = now() where handle = h; end if;
  return result;
end $$;

-- Called after X login: syncs the verified X username and auto-claims a handle reserved for it.
create or replace function public.claim_reserved_profile()
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  xu text;
  r public.reserved_handles%rowtype;
  result public.profiles%rowtype;
begin
  if me is null then raise exception 'Not signed in'; end if;
  xu := public.verified_x_username(me);
  if xu is not null then update public.profiles set x_username = xu, x_claimed = null where id = me; end if;
  if xu is not null then
    select * into r from public.reserved_handles where lower(x_username) = lower(xu) and claimed_by is null limit 1;
    if found and not exists (select 1 from public.profiles where handle = r.handle and id <> me) then
      update public.profiles set handle = r.handle, title = coalesce(r.title, title), bio = coalesce(bio, r.bio),
        avatar_emoji = coalesce(r.avatar_emoji, avatar_emoji) where id = me;
      update public.reserved_handles set claimed_by = me, claimed_at = now() where handle = r.handle;
    end if;
  end if;
  select * into result from public.profiles where id = me;
  return result;
end $$;
revoke execute on function public.claim_handle(text, text) from public, anon;
revoke execute on function public.claim_reserved_profile() from public, anon;
grant execute on function public.claim_handle(text, text) to authenticated;
grant execute on function public.claim_reserved_profile() to authenticated;

-- ───────────────────────── controversies ─────────────────────────
create table if not exists public.controversies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,   -- FK name: controversies_user_id_fkey (used by the client join)
  x_url text check (x_url is null or x_url ~* '^https://(www\.|mobile\.)?(x|twitter)\.com/[A-Za-z0-9_]+/status/[0-9]+'),
  title text not null check (char_length(title) between 8 and 150),
  description text not null check (char_length(description) between 10 and 700),
  tags text[] not null default '{}' check (cardinality(tags) <= 5),
  image_url text,
  poster_emoji text default '🎬' check (char_length(poster_emoji) <= 16),
  poster_text text check (char_length(poster_text) <= 40),
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now(),
  check (x_url is not null or image_url is not null)
);
create unique index if not exists controversies_x_unique on public.controversies(lower(regexp_replace(x_url, '^https://(www\.|mobile\.)?(x|twitter)\.com', 'https://x.com'))) where x_url is not null;
create index if not exists controversies_status_date_idx on public.controversies(status, created_at desc);
create index if not exists controversies_user_idx on public.controversies(user_id);

-- Anti-spam: max 10 submissions per user per 24h.
create or replace function public.limit_submissions() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.controversies where user_id = new.user_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Bhai bas kar. 10 kalesh per day limit.';
  end if;
  return new;
end $$;
drop trigger if exists submission_limit on public.controversies;
create trigger submission_limit before insert on public.controversies for each row execute function public.limit_submissions();

create table if not exists public.spice_votes (
  post_id uuid not null references public.controversies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  spice smallint not null check (spice between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.post_likes (
  post_id uuid not null references public.controversies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.controversies(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'Flagged for review' check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

-- ───────────────────────── meme vault + news (admin-managed from the dashboard) ─────────────────────────
create table if not exists public.memes (
  id uuid primary key default gen_random_uuid(),
  emoji text default '🐈', title text not null, caption text, image_url text,
  sound text default 'pop' check (sound in ('boom','airhorn','bruh','sad','siren','serial','coin','powerup','quack','roar','dhamaka','pop','error','tada')),
  active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.news_flashes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) <= 160),
  active boolean not null default true, created_at timestamptz not null default now()
);

-- ───────────────────────── privileges + RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.reserved_handles enable row level security;
alter table public.controversies enable row level security;
alter table public.spice_votes enable row level security;
alter table public.post_likes enable row level security;
alter table public.reports enable row level security;
alter table public.memes enable row level security;
alter table public.news_flashes enable row level security;

-- Users may only touch harmless profile columns. handle/x_username/title/is_admin are server-controlled.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id) on public.profiles to authenticated;
grant update (avatar_emoji, avatar_url, gang, bio, x_claimed) on public.profiles to authenticated;
-- Users can't change status of their posts.
revoke update on public.controversies from anon, authenticated;
revoke insert, update, delete on public.reserved_handles, public.memes, public.news_flashes from anon, authenticated;

create policy "profiles are public" on public.profiles for select to anon, authenticated using (true);
create policy "create own blank profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "reserved handles are public" on public.reserved_handles for select to anon, authenticated using (true);

create policy "published posts are public" on public.controversies for select to anon, authenticated using (status = 'published' or auth.uid() = user_id);
create policy "submit own pending post" on public.controversies for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending'
    and exists (select 1 from public.profiles where id = auth.uid() and gang is not null and handle is not null));
create policy "delete own post" on public.controversies for delete to authenticated using (auth.uid() = user_id);

create policy "read spice votes" on public.spice_votes for select to authenticated using (true);
create policy "cast own spice vote" on public.spice_votes for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.controversies p where p.id = post_id and p.status = 'published'));
create policy "change own spice vote" on public.spice_votes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read reactions" on public.post_likes for select to authenticated using (true);
create policy "react to published" on public.post_likes for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.controversies p where p.id = post_id and p.status = 'published'));
create policy "undo own reaction" on public.post_likes for delete to authenticated using (auth.uid() = user_id);

create policy "report published" on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id and exists (select 1 from public.controversies p where p.id = post_id and p.status = 'published'));

create policy "active memes are public" on public.memes for select to anon, authenticated using (active);
create policy "active news is public" on public.news_flashes for select to anon, authenticated using (active);

-- ───────────────────────── storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kalesh-media', 'kalesh-media', true, 3145728, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = excluded.allowed_mime_types;
create policy "users upload own kalesh images" on storage.objects for insert to authenticated
  with check (bucket_id = 'kalesh-media' and (storage.foldername(name))[1] = (auth.uid())::text);
create policy "public image view" on storage.objects for select to public using (bucket_id = 'kalesh-media');

-- ───────────────────────── admin cheat-sheet (run manually) ─────────────────────────
-- Approve a post:          update public.controversies set status = 'published' where id = '...';
-- Give someone a title:    update public.profiles set title = 'Minister of Unemployment' where handle = 'someone';
-- Add a meme to the vault: insert into public.memes (emoji, title, caption, sound) values ('🐈','BILLI CEO','Meeting cancel.','boom');
-- Add a breaking news line: insert into public.news_flashes (text) values ('BILLI NE PHIR SE SERVER BAND KIYA');
-- Reserve a VIP handle for an X account (only that X account can claim it, by logging in with X):
--   insert into public.reserved_handles (handle, x_username, title, bio, avatar_emoji)
--   values ('somehandle', 'their_x_username', 'Founding Kalesh Correspondent', 'Reserved for you. Login with X to claim.', '👑');
--   Share link: https://YOUR_DOMAIN/#/u/somehandle
