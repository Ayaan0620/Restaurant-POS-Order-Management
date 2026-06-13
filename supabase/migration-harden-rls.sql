-- ============================================================================
-- MIGRATION: tighten Row Level Security.
-- Replaces the permissive "for all" policies with read + insert + update only
-- (NO delete), so orders/settings can't be wiped via the public API.
-- Run once in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================================

alter table public.orders enable row level security;
alter table public.app_settings enable row level security;

-- orders
drop policy if exists "anon full access" on public.orders;
drop policy if exists "anon read orders" on public.orders;
drop policy if exists "anon insert orders" on public.orders;
drop policy if exists "anon update orders" on public.orders;
create policy "anon read orders"   on public.orders for select using (true);
create policy "anon insert orders" on public.orders for insert with check (true);
create policy "anon update orders" on public.orders for update using (true) with check (true);

-- app_settings (menu)
drop policy if exists "anon full access settings" on public.app_settings;
drop policy if exists "anon read settings" on public.app_settings;
drop policy if exists "anon insert settings" on public.app_settings;
drop policy if exists "anon update settings" on public.app_settings;
create policy "anon read settings"   on public.app_settings for select using (true);
create policy "anon insert settings" on public.app_settings for insert with check (true);
create policy "anon update settings" on public.app_settings for update using (true) with check (true);
