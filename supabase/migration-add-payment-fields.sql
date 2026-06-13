-- ============================================================================
-- MIGRATION: add discount / VAT / payment-method columns to an existing table.
-- Run this once in the Supabase SQL Editor if you created the orders table
-- before these features were added. Safe to run more than once.
-- ============================================================================

alter table public.orders add column if not exists subtotal       numeric not null default 0;
alter table public.orders add column if not exists discount_pct   numeric not null default 0;
alter table public.orders add column if not exists vat            numeric not null default 0;
alter table public.orders add column if not exists payment_method text    not null default 'cash';
