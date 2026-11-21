-- KALESH.EXE — username + password login.
-- Run after supabase-schema.sql (SQL editor, once).
--
-- How it works: Supabase Auth needs an email, so the site signs people up as
-- <username>@<authEmailDomain from config.js>. Nobody ever sees or receives that email.
-- Required dashboard settings:
--   Authentication → Providers → Email: ON, "Confirm email": OFF
--   (with confirmation on, signup never returns a session and the user is stuck).
-- Supabase stores passwords hashed (bcrypt); we never touch raw passwords.

-- Shared rules for a username (same as claim_handle).
create or replace function public.username_problem(p_username text, p_self uuid default null)
returns text language plpgsql stable security definer set search_path = '' as $$
declare h text := lower(trim(coalesce(p_username, '')));
begin
  if h !~ '^[a-z0-9_]{3,20}$' then return 'Username 3-20 chars ka ho: a-z 0-9 _'; end if;
  if h in ('admin','administrator','kalesh','kaleshexe','kalesh_desk','mod','moderator','root','support','system','official','null','undefined')
    then return 'Ye username sarkar ne reserve kiya hai'; end if;
  if exists (select 1 from public.profiles where handle = h and id is distinct from p_self) then return 'Ye username kisi aur nalle ka hai'; end if;
  if exists (select 1 from public.reserved_handles where handle = h and claimed_by is null)
    then return 'Ye username ek X account ke liye reserved hai'; end if;
  return null;
end $$;

-- Called by the signup form before creating the account, for a friendly error.
-- Returns null when the username is free, otherwise the reason.
create or replace function public.username_available(p_username text)
returns text language sql stable security definer set search_path = '' as $$
  select public.username_problem(p_username, null)
$$;
revoke execute on function public.username_problem(text, uuid) from public, anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;

-- New-user trigger: X logins keep their verified X username (as before);
-- username signups get their handle set immediately, so there's no separate claim step.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  u text := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  problem text;
begin
  -- System accounts (e.g. the KALESH DESK bot, inserted by SQL) skip the rules; their profile is set up by their own migration.
  -- raw_app_meta_data can't be set by users through the Auth API, so this can't be abused from signup.
  if new.raw_app_meta_data->>'provider' = 'system' then u := ''; end if;
  if u <> '' then
    problem := public.username_problem(u, new.id);
    if problem is not null then raise exception 'KALESH_USERNAME: %', problem; end if;
    -- The login email must be exactly <username>@..., so nobody can squat someone else's login name
    -- by calling the Auth API directly with mismatched metadata.
    if lower(split_part(new.email, '@', 1)) <> u then raise exception 'KALESH_USERNAME: username and login do not match'; end if;
  end if;
  insert into public.profiles (id, handle, x_username)
  values (new.id,
    nullif(u, ''),
    case when new.raw_app_meta_data->>'provider' in ('twitter','x')
      then nullif(coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'preferred_username'), '') end)
  on conflict (id) do nothing;
  return new;
end $$;
-- (trigger on_auth_user_created from supabase-schema.sql already points at this function)

-- ───────────── admin cheat-sheet (run manually) ─────────────
-- Forgot password? There is no email to reset through, so reset it by hand:
--   update auth.users set encrypted_password = extensions.crypt('NewPassword123', extensions.gen_salt('bf'))
--   where id = (select id from public.profiles where handle = 'someone');
-- Ban someone (blocks login):
--   update auth.users set banned_until = 'infinity' where id = (select id from public.profiles where handle = 'someone');
