-- Apply after supabase-schema.sql in a configured KALESH Supabase project.
create table if not exists public.profile_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 2 and 180),
  created_at timestamptz not null default now(),
  unique (profile_id, author_id),
  check (profile_id <> author_id)
);
create index if not exists profile_notes_recipient_idx on public.profile_notes (profile_id, created_at desc);
alter table public.profile_notes enable row level security;
revoke all on public.profile_notes from anon, authenticated;
grant select on public.profile_notes to anon, authenticated;
grant insert (profile_id, author_id, message), delete on public.profile_notes to authenticated;
drop policy if exists "read guestbook" on public.profile_notes;
create policy "read guestbook" on public.profile_notes for select using (true);
drop policy if exists "sign guestbook" on public.profile_notes;
create policy "sign guestbook" on public.profile_notes for insert to authenticated with check (
  auth.uid() = author_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.handle is not null and p.gang is not null)
);
drop policy if exists "remove guestbook note" on public.profile_notes;
create policy "remove guestbook note" on public.profile_notes for delete to authenticated using (auth.uid() in (author_id, profile_id));
