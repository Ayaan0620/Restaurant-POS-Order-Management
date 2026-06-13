// ============================================================================
// MENU CONFIG  —  edit this file to change the menu.
//
// Each item: { name, price, category, veg }
//   - price : number in EUROS.  *** THESE ARE PLACEHOLDER PRICES — REPLACE ***
//   - veg   : true  => green dot (vegetarian)
//             false => red dot   (non-vegetarian)
//   - category: items are shown grouped by this label, in the order below.
//
// Kothu Parota is split into a Veg and an Egg variant (they are different dishes).
// ============================================================================

const menu = [
  // ---- Biryani ----
  { name: 'Chicken Biryani',     price: 8.5,  category: 'Biryani', veg: false },
  { name: 'Mutton Biryani',      price: 10.0, category: 'Biryani', veg: false },
  { name: 'Chicken 65 Biryani',  price: 9.0,  category: 'Biryani', veg: false },
  { name: 'Egg Biryani',         price: 7.0,  category: 'Biryani', veg: false },

  // ---- Starters & Rolls ----
  { name: 'Chicken 65',          price: 6.5,  category: 'Starters & Rolls', veg: false },
  { name: 'Veg Roll',            price: 4.0,  category: 'Starters & Rolls', veg: true  },
  { name: 'Mutton Roll',         price: 5.5,  category: 'Starters & Rolls', veg: false },

  // ---- Kothu & Parota ----
  { name: 'Kothu Parota (Veg)',  price: 6.0,  category: 'Kothu & Parota', veg: true  },
  { name: 'Kothu Parota (Egg)',  price: 6.5,  category: 'Kothu & Parota', veg: false },
  { name: 'Mutton Kothu Kari',   price: 8.0,  category: 'Kothu & Parota', veg: false },

  // ---- Rice & Tiffin ----
  { name: 'Ghee Rice',           price: 5.0,  category: 'Rice & Tiffin', veg: true },
  { name: 'Idiyappam',           price: 5.5,  category: 'Rice & Tiffin', veg: true },
  { name: 'Ulunda Vada',         price: 3.5,  category: 'Rice & Tiffin', veg: true },

  // ---- Gravy & Noodles ----
  { name: 'Chicken Chettinadu Gravy', price: 7.0, category: 'Gravy & Noodles', veg: false },
  { name: 'Veg & Paneer Noodles',     price: 6.5, category: 'Gravy & Noodles', veg: true  },
]

// Category display order (any category not listed here is appended at the end).
export const CATEGORY_ORDER = [
  'Biryani',
  'Starters & Rolls',
  'Kothu & Parota',
  'Rice & Tiffin',
  'Gravy & Noodles',
]

export default menu
