# Stall Orders — Festival Order Management

A mobile-first web app for a food stall: one cashier takes orders, a pickup person
assembles and calls numbers, kitchen staff watch a read-only queue, and the owner
views reports. Built to handle ~300 orders over a 7-hour service window, with
real-time sync across devices and a **local-first design so an order is never lost**,
even offline.

## Views (each is its own bookmarkable URL)

| URL         | Who         | What |
|-------------|-------------|------|
| `/`         | —           | Home screen with links to all four views |
| `/cashier`  | Cashier     | Tap-to-order menu, cart, change calculator, sends order numbers |
| `/pickup`   | Pickup crew | Active orders oldest-first, mark Collected / Void, new-order beep |
| `/kitchen`  | Kitchen     | Dark, oversized, read-only queue |
| `/reports`  | Owner       | PIN-protected **Admin**: Reports + break-even, **Menu** editor, **Costs** editor |

**Admin is hidden** from the home screen. To open it, **tap the "Stall Orders" title 5
times quickly** (or just go to `/reports` directly). This keeps staff/customers out of
the owner's reports.

Open each URL on the relevant device and bookmark it / add to home screen.

## Setup

### 1. Create a Supabase project (recommended, for multi-device sync)
1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Open the **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql),
   and click **Run**. This creates the `orders` table, indexes, realtime publication,
   and an anon-access policy (the app has no login — it runs on the stall's own devices).
3. In **Database → Replication** (or **Realtime**), confirm the `orders` table is enabled
   for realtime. The schema script already adds it to the `supabase_realtime` publication.
4. Go to **Settings → API** and copy the **Project URL** and the **anon public** key.

> Skipping Supabase? The app still runs — it just works on a single device using local
> storage only (no cross-device sync). Cashier/Pickup/Kitchen/Reports must then be used
> on the **same** device/browser.

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
# Four role PINs, stored as SHA-256 HASHES so no plaintext ships in the app.
# Generate one with:  npm run hash-pin -- 1234   (REPORTS = the Admin role)
VITE_CASHIER_PIN_HASH=<hash>
VITE_PICKUP_PIN_HASH=<hash>
VITE_KITCHEN_PIN_HASH=<hash>
VITE_REPORTS_PIN_HASH=<hash>
```

**PIN hierarchy** (higher roles open lower views):
- **Admin** (reports PIN) → opens everything
- **Cashier** → cashier, pickup, kitchen (not admin)
- **Kitchen / Pickup** (floor staff) → both the kitchen and pickup screens

So a view accepts its own PIN or any higher role's PIN. See **Security** below for
what these do and don't protect.

> **Upgrading an existing database?** The simplest, safest way to get every new
> column and table is to **paste the whole [`supabase/schema.sql`](supabase/schema.sql)
> again and Run** — it's idempotent (only adds what's missing). That covers the
> discount / card-fee / payment-method columns **and** the `app_settings` table used to
> sync the editable menu. (Individual migrations also exist:
> [`migration-add-payment-fields.sql`](supabase/migration-add-payment-fields.sql),
> [`migration-add-menu-settings.sql`](supabase/migration-add-menu-settings.sql).)

### 3. Install and run
```bash
npm install
npm run dev
```
Open the printed URL (e.g. `http://localhost:5173`). Vite also prints a
**Network** URL (e.g. `http://192.168.x.x:5173`) — open that on phones/tablets on the
same Wi-Fi to use the app on real devices.

### 4. Build for production
```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```
Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

## The menu

The menu is **editable in the app**: open **Admin → Menu** to change names, prices,
categories, and veg/non-veg, and to add or delete items. Press **Save** and the changes
sync to the cashier (via the `app_settings` table; if Supabase isn't set up it saves
locally on that device).

[`src/menu.config.js`](src/menu.config.js) is just the **initial seed** used the first
time the app runs (each item `{ name, price, category, veg }`, prices in **euros** — the
seed prices are PLACEHOLDERS). On the cashier screen, veg items sit in the **left**
column and non-veg in the **right** column, per category. Kothu Parota is split into a
**Veg** and an **Egg** variant.

## Discounts, payment method & the card fee

At the cashier, per order you can:
- Apply a **discount %** (quick buttons 5/10/15/20% or a custom value).
- Pick **Cash** or **Card**. The customer **pays the same either way** — the price is
  `items − discount`.

The **2% card fee is a cost for reporting only** — it is *not* added to the customer's
total. For card orders the app records `2% × subtotal` as your processing cost so the
**Reports** page can show **net after card fees**: `revenue − card fees = net`. Reports
also show total discounts given and a cash-vs-card split. The order log and CSV record
the payment method, discount %, subtotal, card fee (cost), and total for every order.

> Net does **not** yet subtract cost of ingredients (COGS) — it's revenue minus card
> fees. Add ingredient costs later if you want true profit.

## Reliability — how an order is never lost

1. Every order is written to **localStorage *and* IndexedDB before any network call**,
   so a refresh, crash, or dead network can't drop it.
2. Sync to Supabase uses an **idempotent upsert keyed on a client-generated UUID**, so
   retries never create duplicates.
3. A background loop retries unsynced orders with exponential backoff, and also flushes
   when the device comes back **online** or the tab regains focus.
4. The connection dot shows **green/amber/red** plus a **count of queued (unsynced)
   orders**; the cashier is warned before closing the tab while any remain.
5. The screen is kept awake (Wake-Lock) on cashier/pickup during service.
6. Orders are only ever **status-changed** (collected / voided), never deleted.

## Security

This is a **login-free** app, so be clear-eyed about what that means:

- **PINs are hashed, not plaintext.** The app stores a SHA-256 hash of each PIN, so
  "view source" on the deployed site never reveals a password. (Generate hashes with
  `npm run hash-pin -- <PIN>`.) This is **deterrence, not strong security** — PINs gate
  the *screens*, and short numeric PINs can still be brute-forced. Use longer, distinct
  PINs, especially for Admin.
- **The Supabase anon/publishable key is public by design.** It ships in the browser and
  that's expected. What protects you is the database policy (RLS), not hiding the key.
  **Never** put the `service_role` key in any `VITE_` variable.
- **Database is hardened against deletion.** RLS allows read/insert/update but **no
  delete**, so orders can't be wiped through the API (`schema.sql` /
  `migration-harden-rls.sql`).
- **Honest limit:** because a login-free app must read/write with the public key, someone
  who extracts that key could still *read* order data directly from Supabase's API. PINs
  can't prevent that. If the data must be truly private, add **Supabase Auth + RLS that
  requires a logged-in user** — the only real fix. (Happy to add this later.)
- **Secrets stay out of Git.** `.env` is git-ignored; `.env.example` and the README use
  placeholders only.

## Notes & possible next steps
- Order numbers are 3-digit, padded (`001`, `002`, …) and **reset each day** (keyed on
  the local date).
- Not built (easy future adds): sold-out/"86" toggle, per-item notes, PWA install +
  service worker, thermal-printer receipts, end-of-day cash reconciliation report.
