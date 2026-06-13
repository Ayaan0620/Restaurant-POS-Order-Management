-- ============================================================================
-- Restaurant Stall Order Management — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- ============================================================================

-- Single table: orders
create table if not exists public.orders (
  id              uuid        primary key default gen_random_uuid(),
  order_number    text        not null,
  items           jsonb       not null default '[]'::jsonb,  -- [{name, price, quantity, veg}]
  total           numeric     not null default 0,            -- final amount charged (subtotal + vat)
  subtotal        numeric     not null default 0,            -- items total after discount, before card fee
  discount_pct    numeric     not null default 0,            -- 0-100
  vat             numeric     not null default 0,            -- 2% card fee (0 for cash)
  payment_method  text        not null default 'cash',       -- cash | card
  status          text        not null default 'active',     -- active | collected | voided
  order_type      text        not null default 'dinein',     -- parcel | dinein
  created_at      timestamptz not null default now(),
  collected_at    timestamptz,
  date            date        not null default (now() at time zone 'utc')::date
);

-- If you created the table from an earlier version, these add the new columns.
-- Safe to run repeatedly (they only add what's missing).
alter table public.orders add column if not exists subtotal       numeric not null default 0;
alter table public.orders add column if not exists discount_pct   numeric not null default 0;
alter table public.orders add column if not exists vat            numeric not null default 0;
alter table public.orders add column if not exists payment_method text    not null default 'cash';

-- Indexes for the queries the app actually runs.
create index if not exists orders_date_status_idx on public.orders (date, status);
create index if not exists orders_created_at_idx   on public.orders (created_at);

-- ----------------------------------------------------------------------------
-- app_settings: small key/value store. Used to sync the editable MENU (the
-- Admin page edits it) across devices. key='menu', value = the menu array.
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_settings replica identity full;

-- ----------------------------------------------------------------------------
-- Realtime: let clients subscribe to live changes on this table.
-- ----------------------------------------------------------------------------
alter table public.orders replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Row Level Security.
-- This app has NO auth (it's a kiosk on the stall's own devices), so we allow
-- the anon key to read/write. If you later add auth, tighten these policies.
-- ----------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "anon full access" on public.orders;
create policy "anon full access"
  on public.orders
  for all
  using (true)
  with check (true);

drop policy if exists "anon full access settings" on public.app_settings;
create policy "anon full access settings"
  on public.app_settings
  for all
  using (true)
  with check (true);
