-- KALESH.EXE database, V1. Run in the Supabase SQL editor in a new project.
-- Public API keys are safe for the browser only with these RLS rules enabled.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 1 and 32),
  gang text check (gang in ('balaks','bataks')),
  avatar_emoji text not null default '🐈',
  avatar_url text,
  created_at timestamptz not null default now()
);
create index if not exists profiles_gang_idx on public.profiles(gang);

-- Prevent changing teams after the first choice, including via direct API requests.
create or replace function public.prevent_gang_switch()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.gang is not null and new.gang is distinct from old.gang then
    raise exception 'Gang choice is permanent';
  end if;
  return new;
end;
$$;
drop trigger if exists preserve_gang on public.profiles;
create trigger preserve_gang before update on public.profiles
for each row execute function public.prevent_gang_switch();

create table if not exists public.controversies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  x_url text,
  title text not null check (char_length(title) between 8 and 150),
  description text not null check (char_length(description) between 10 and 700),
  tags text[] not null default '{}',
  image_url text,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now(),
  check (x_url is not null or image_url is not null)
);
create unique index if not exists controversies_x_unique on public.controversies(lower(x_url)) where x_url is not null;
create index if not exists controversies_status_date_idx on public.controversies(status, created_at desc);
create index if not exists controversies_user_idx on public.controversies(user_id);

create table if not exists public.spice_votes (
  post_id uuid not null references public.controversies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  spice smallint not null check (spice between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);
create index if not exists spice_votes_user_idx on public.spice_votes(user_id);

create table if not exists public.post_likes (
  post_id uuid not null references public.controversies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.controversies(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'Flagged for review' check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  unique (post_id,reporter_id)
);

alter table public.profiles enable row level security;
alter table public.controversies enable row level security;
alter table public.spice_votes enable row level security;
alter table public.post_likes enable row level security;
alter table public.reports enable row level security;

create policy "profile read" on public.profiles for select to authenticated using (true);
create policy "profile create self" on public.profiles for insert to authenticated with check (auth.uid()=id and gang is null);
create policy "profile update self" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);

create policy "published or own controversy read" on public.controversies for select to authenticated
using (status='published' or auth.uid()=user_id);
create policy "submit pending own controversy" on public.controversies for insert to authenticated
with check (auth.uid()=user_id and status='pending' and exists (
  select 1 from public.profiles where id=auth.uid() and gang is not null
));

create policy "read spice votes" on public.spice_votes for select to authenticated using (true);
create policy "cast own spice vote" on public.spice_votes for insert to authenticated
with check (auth.uid()=user_id and exists (select 1 from public.controversies p where p.id=post_id and p.status='published'));
create policy "change own spice vote" on public.spice_votes for update to authenticated
using (auth.uid()=user_id) with check (auth.uid()=user_id and exists (select 1 from public.controversies p where p.id=post_id and p.status='published'));

create policy "read public reactions" on public.post_likes for select to authenticated using (true);
create policy "react to published posts" on public.post_likes for insert to authenticated
with check (auth.uid()=user_id and exists (select 1 from public.controversies p where p.id=post_id and p.status='published'));
create policy "undo own reaction" on public.post_likes for delete to authenticated using (auth.uid()=user_id);

create policy "report a published post" on public.reports for insert to authenticated
with check (auth.uid()=reporter_id and exists (select 1 from public.controversies p where p.id=post_id and p.status='published'));
-- Reports cannot be read by ordinary users; review them in the Supabase dashboard.

-- One public bucket, with authenticated uploads restricted to a folder named after the user's UID.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('kalesh-media','kalesh-media',true,3145728,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public=true,file_size_limit=3145728,allowed_mime_types=excluded.allowed_mime_types;
create policy "users upload own kalesh images" on storage.objects for insert to authenticated
with check (bucket_id='kalesh-media' and (storage.foldername(name))[1]=(auth.uid())::text);
create policy "public image view" on storage.objects for select to public using (bucket_id='kalesh-media');

-- Moderation: new entries are pending. Review from Supabase Table Editor and
-- set status='published' only for acceptable original/public submissions.
-- Never embed a service_role key in client code.
