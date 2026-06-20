// ============================================================================
// MENU CONFIG  —  seed used the first time the app runs. After that the live
// menu is edited in-app (Admin → Menu or the /menu screen) and synced.
//
// Each item: { name, price, category, veg }
//   - price : number in EUROS
//   - veg   : true => green dot (veg) / false => red dot (non-veg)
//   - category: items are shown grouped by this label, in CATEGORY_ORDER order.
// ============================================================================

const menu = [
  // ---- Biryani ----
  { name: 'Chicken Biryani',        price: 12,  category: 'Biryani', veg: false },
  { name: 'Mutton Biryani',         price: 13,  category: 'Biryani', veg: false },

  // ---- Starters & Rolls ----
  { name: 'Chicken 65',             price: 8,   category: 'Starters & Rolls', veg: false },
  { name: 'Veg Roll (2)',           price: 5,   category: 'Starters & Rolls', veg: true  },
  { name: 'Mutton Roll (2)',        price: 6,   category: 'Starters & Rolls', veg: false },
  { name: 'Vada w/ Chutney (2)',    price: 5,   category: 'Starters & Rolls', veg: true  },

  // ---- Kothu & Parotta ----
  { name: 'Chicken Kothu Parotta',  price: 12,  category: 'Kothu & Parotta', veg: false },
  { name: 'Mutton Kothu Parotta',   price: 13,  category: 'Kothu & Parotta', veg: false },

  // ---- Mains ----
  { name: 'Idiyappam & Kothukari',           price: 13, category: 'Mains', veg: false },
  { name: 'Chettinadu Chicken + Ghee Rice',  price: 14, category: 'Mains', veg: false },
  { name: 'Paneer Noodles',                  price: 10, category: 'Mains', veg: true  },

  // ---- Desserts ----
  { name: 'Paruppu Payasam',        price: 2,    category: 'Desserts', veg: true },
  { name: 'Home Made Kulfi',        price: 2.5,  category: 'Desserts', veg: true },
]

// Category display order (any category not listed is appended at the end).
export const CATEGORY_ORDER = [
  'Biryani',
  'Starters & Rolls',
  'Kothu & Parotta',
  'Mains',
  'Desserts',
]

export default menu
