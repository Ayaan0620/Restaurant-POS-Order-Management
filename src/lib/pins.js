// ============================================================================
// PIN privilege hierarchy.
//
// Roles, lowest → highest privilege:
//   floor staff — kitchen & pickup PINs (1)  <  cashier (2)  <  admin (3)
//
// A view is unlocked by its own role PIN OR any HIGHER role's PIN:
//   - Admin PIN    → opens everything (admin, cashier, pickup, kitchen)
//   - Cashier PIN  → opens cashier, pickup, kitchen   (NOT admin)
//   - Kitchen PIN  → opens kitchen AND pickup
//   - Pickup PIN   → opens pickup AND kitchen
//
// Kitchen & pickup are the same "floor" tier — each can see both screens.
// Each role's PIN is configured via env as a SHA-256 hash (preferred) or
// plaintext. The Admin role uses the REPORTS PIN env vars.
// ============================================================================

const ENV = import.meta.env

const ROLES = {
  kitchen: { level: 1, hash: ENV.VITE_KITCHEN_PIN_HASH, pin: ENV.VITE_KITCHEN_PIN },
  pickup: { level: 1, hash: ENV.VITE_PICKUP_PIN_HASH, pin: ENV.VITE_PICKUP_PIN },
  cashier: { level: 2, hash: ENV.VITE_CASHIER_PIN_HASH, pin: ENV.VITE_CASHIER_PIN },
  admin: { level: 3, hash: ENV.VITE_REPORTS_PIN_HASH, pin: ENV.VITE_REPORTS_PIN },
}

// Minimum role level required to open each view (route key).
const VIEW_MIN_LEVEL = {
  kitchen: 1, // floor staff and up
  pickup: 1, // floor staff and up
  menu: 2, // cashier and up (edits prices)
  cashier: 2, // cashier and up
  reports: 3, // admin only
}

function credFor(role) {
  if (role.hash) return { token: String(role.hash).trim().toLowerCase(), hashed: true }
  if (role.pin) return { token: String(role.pin), hashed: false }
  return null
}

// All PIN credentials that should unlock the given view (its level and above).
export function acceptableCreds(viewKey) {
  const min = VIEW_MIN_LEVEL[viewKey] ?? 4
  const out = []
  for (const role of Object.values(ROLES)) {
    if (role.level >= min) {
      const c = credFor(role)
      if (c) out.push(c)
    }
  }
  return out
}
