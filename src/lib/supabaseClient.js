import { createClient } from '@supabase/supabase-js'

// Read Supabase config from Vite env. If either value is missing, we run in
// "local only" mode (single device) — the app stays fully functional and
// durable on that device, it just can't sync to other devices.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null

export const TABLE = 'orders'
