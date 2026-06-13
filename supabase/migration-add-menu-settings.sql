-- ============================================================================
-- MIGRATION: add the app_settings table used to sync the editable MENU across
-- devices (the Admin page edits it). Run once in the Supabase SQL Editor.
-- Safe to run more than once.
--
-- NOTE: The menu editor works WITHOUT this (it falls back to localStorage on
-- one device). Run this so menu edits also reach the cashier device(s).
-- ============================================================================

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings replica identity full;
alter table public.app_settings enable row level security;

drop policy if exists "anon full access settings" on public.app_settings;
create policy "anon full access settings"
  on public.app_settings
  for all
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;
