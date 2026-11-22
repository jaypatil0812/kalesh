-- KALESH.EXE — lock down internal functions (fixes from Supabase's security advisor).
-- Run after 002_content_pipeline.sql. Safe to run more than once.

-- Trigger functions only ever run from their triggers. Postgres checks EXECUTE when a trigger is
-- created, not when it fires, so revoking it doesn't change behaviour. It only stops anyone calling
-- them directly through /rest/v1/rpc/...
revoke execute on function public.handle_new_user()    from public, anon, authenticated;
revoke execute on function public.limit_submissions()  from public, anon, authenticated;
revoke execute on function public.auto_hide_reported() from public, anon, authenticated;

-- Pin the search path (advisor: function_search_path_mutable). The function only returns a constant.
alter function public.kalesh_desk_id() set search_path = '';

-- Intentionally left callable (the advisor lists them as warnings, which is expected):
--   username_available(text)        anon + authenticated: the signup form checks a username before creating the account
--   claim_handle(text, text)        authenticated: X-login users pick their handle
--   claim_reserved_profile()        authenticated: X-login users claim a VIP handle reserved for them
