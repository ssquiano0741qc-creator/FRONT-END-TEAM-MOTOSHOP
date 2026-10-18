/* ==========================================================================
   mock-data.js
   ----------------------------------------------------------------------
   Every "table" the prototype needs, plus small shared helpers (Utils).
   This file only builds DEFAULT_DB — it does not read/write storage.
   store.js decides when DEFAULT_DB gets seeded into localStorage.

   BACKEND NOTE: DEFAULT_DB is shaped exactly like the tables a real
   backend would expose (products, sales, inventoryTransactions,
   suppliers, users, notifications). Swap each array for the response
   of a real endpoint later and the rest of the app does not change.
   ========================================================================== */

/* ---------- Utils: small helpers shared by every page ---------- */
const Utils = {
  formatPHP(amount) {
    const n = Number(amount) || 0;
    return '₱' + n.toLocaleString('en-PH', { maximumFractionDigits: 0 });
  },
  formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  },
  formatShortDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  },
  timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    return Utils.formatShortDate(iso);
  },
  getStockStatus(stock, reorderLevel) {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= reorderLevel) return 'Low Stock';
    return 'In Stock';
  },
  statusClass(status) {
    if (status === 'Out of Stock') return 'badge-danger';
    if (status === 'Low Stock') return 'badge-warn';
    return 'badge-ok';
  },
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
  },
  pad(num, len) {
    return String(num).padStart(len, '0');
  },
  nextId(prefix, existingIds, padLen) {
    let max = 0;
    existingIds.forEach(id => {
      const m = String(id).match(new RegExp('^' + prefix + '-(\\d+)$'));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return prefix + '-' + Utils.pad(max + 1, padLen || 4);
  },
  qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  },
  /* The seed data ends on Aug 30, 2026. Anything the user does live during
     a demo (completing a POS sale, stock in/out) should read as "today" no
     matter what the real calendar date is when the prototype is opened —
     so "now" keeps that date fixed and only borrows the real clock's
     hour/minute/second, which keeps same-session actions ordered correctly. */
  demoNow() {
    const real = new Date();
    return new Date(2026, 7, 30, real.getHours(), real.getMinutes(), real.getSeconds(), real.getMilliseconds());
  },
  /* ---- Warranty rules ----
     Rubber items (tires) only carry a short, defect-only warranty:
     RUBBER_WARRANTY_DAYS (7 days) from the purchase date. */
  isRubberItem(product) {
    if (!product) return false;
    if (product.rubber === true) return true;
    return /\b(tires?|tyres?|rubber)\b/i.test(product.name || '');
  },
  warrantyDaysFor(product) {
    return Utils.isRubberItem(product) ? RUBBER_WARRANTY_DAYS : null;
  },
  /* 'YYYY-MM-DD' + n days -> 'YYYY-MM-DD' (no timezone drift) */
  addDaysISO(iso, days) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().slice(0, 10);
  },
  /* Simple inline icon per category — keeps the prototype working
     without needing real product photography. `image` on a product
     just stores this same category key today; later it becomes a
     real uploaded file URL and this function stops being called. */
  categoryIcon(categoryId) {
    const icons = {
      motorcycles: '<circle cx="5" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><polyline points="5,17 9,9 14,9 18,17"/><line x1="9" y1="9" x2="7.5" y2="5.5"/><line x1="14" y1="9" x2="16" y2="6.5"/>',
      lights: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4" y1="12" x2="2" y2="12"/><line x1="22" y1="12" x2="20" y2="12"/>',
      electrical: '<polygon points="13,2 4,14 11,14 10,22 20,9 13,9"/>',
      brakes: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><line x1="12" y1="4" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="20"/><line x1="4" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="20" y2="12"/>',
      accessories: '<ellipse cx="12" cy="9" rx="7" ry="5"/><line x1="12" y1="14" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/>',
      'engine-parts': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
      'other-parts': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="3" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21" y2="12"/><line x1="5.6" y1="5.6" x2="7" y2="7"/><line x1="17" y1="17" x2="18.4" y2="18.4"/><line x1="18.4" y1="5.6" x2="17" y2="7"/><line x1="7" y1="17" x2="5.6" y2="18.4"/>'
    };
    return icons[categoryId] || icons['other-parts'];
  }
};

const UNIVERSAL_FIT = 'Universal (All Models)';

/* Warranty limit for rubber items (tires): defects only, 7 days from purchase. */
const RUBBER_WARRANTY_DAYS = 7;
const RUBBER_WARRANTY_COVERAGE = 'Manufacturing defects only \u2014 ' + RUBBER_WARRANTY_DAYS + ' days from purchase (tires/rubber)';

/* ---------- Categories ---------- */
const CATEGORIES = [
  { id: 'lights', name: 'Lights', prefix: 'LGT' },
  { id: 'electrical', name: 'Electrical', prefix: 'ELC' },
  { id: 'brakes', name: 'Brakes', prefix: 'BRK' },
  { id: 'accessories', name: 'Accessories', prefix: 'ACC' },
  { id: 'engine-parts', name: 'Engine Parts', prefix: 'ENG' },
  { id: 'other-parts', name: 'Other Parts', prefix: 'OTH' }
];

/* ---------- Motorcycle compatibility ---------- */
const MOTO_BRANDS = {
  Yamaha: ['NMAX', 'Aerox', 'Mio i125', 'Sniper 155'],
  Honda: ['Click 125i', 'Click 160', 'Beat', 'ADV 160'],
  Suzuki: ['Burgman Street', 'Raider R150', 'Skydrive']
};

/* ---------- Suppliers ---------- */
const SUPPLIERS = [
  {
    id: 'SUP-001', name: 'MotoParts Central Trading', contactPerson: 'Ramon Cruz',
    contactNumber: '0917-234-5678', email: '[email protected]',
    lastDelivery: '2026-08-20', status: 'Active'
  },
  {
    id: 'SUP-002', name: 'Yamaha Genuine Parts Distributor', contactPerson: 'Liza Fernandez',
    contactNumber: '0918-345-6789', email: '[email protected]',
    lastDelivery: '2026-08-24', status: 'Active'
  },
  {
    id: 'SUP-003', name: 'RoadGear Accessories Supply', contactPerson: 'Mark Villanueva',
    contactNumber: '0919-456-7890', email: '[email protected]',
    lastDelivery: '2026-08-18', status: 'Active'
  }
];

/* ---------- Products ---------- */
/* `brand` = who makes the PART (manufacturer) — separate from `compatibility`,
   which is which MOTORCYCLE the part fits. `compatYears` is descriptive only
   (shown on the form/detail page) and isn't wired into fitment filtering yet.
   Complete motorcycles are no longer sold through the catalog (the old 'motorcycles'
   category and its three listings were removed); see RETIRED_MOTORCYCLE_UNITS below. */
const PRODUCTS = [
  { id: 'BRK-001', name: 'NMAX Brake Pad Set', brand: 'Generic', category: 'brakes', compatibility: ['Yamaha NMAX'], compatYears: '2020-2024', supplier: 'SUP-001', supplierRef: 'ABC-BP-014', description: 'Direct-fit front brake pad set for the Yamaha NMAX, sintered compound for consistent stopping power.', costPrice: 280, sellingPrice: 450, stock: 8, reorderLevel: 10, image: 'brakes', archived: false },
  { id: 'BRK-002', name: 'Universal Brake Pad Set', brand: 'Generic', category: 'brakes', compatibility: ['Honda Click 125i', 'Honda Click 160', 'Honda Beat'], compatYears: '2019-2025', supplier: 'SUP-001', supplierRef: 'ABC-BP-022', description: 'Standard replacement brake pad set fitting most Honda Click and Beat variants.', costPrice: 220, sellingPrice: 380, stock: 24, reorderLevel: 10, image: 'brakes', archived: false },
  { id: 'ENG-001', name: 'Motul 5100 10W-40 (1L)', brand: 'Motul', category: 'engine-parts', compatibility: [UNIVERSAL_FIT], compatYears: 'All Years', supplier: 'SUP-002', supplierRef: 'YGP-OIL-5100', description: 'Ester-based semi-synthetic engine oil, 1 liter bottle. Safe for wet clutch systems.', costPrice: 340, sellingPrice: 460, stock: 30, reorderLevel: 15, image: 'engine-parts', archived: false },
  { id: 'ENG-002', name: 'Yamaha Genuine Air Filter', brand: 'Yamaha Genuine', category: 'engine-parts', compatibility: ['Yamaha NMAX', 'Yamaha Aerox'], compatYears: '2018-2024', supplier: 'SUP-002', supplierRef: 'YGP-AF-118', description: 'OEM-spec air filter element for Yamaha NMAX and Aerox.', costPrice: 260, sellingPrice: 420, stock: 3, reorderLevel: 8, image: 'engine-parts', archived: false },
  { id: 'ENG-003', name: 'Chain and Sprocket Set 428H', brand: 'RK Chains', category: 'engine-parts', compatibility: ['Suzuki Raider R150'], compatYears: '2017-2023', supplier: 'SUP-001', supplierRef: 'ABC-CS-428', description: 'Complete drive chain and front/rear sprocket set for the Suzuki Raider R150.', costPrice: 1650, sellingPrice: 2350, stock: 6, reorderLevel: 5, image: 'engine-parts', archived: false },
  { id: 'OTH-001', name: 'Motorcycle Tire 90/80-14', brand: 'IRC', category: 'other-parts', compatibility: ['Yamaha NMAX', 'Honda Click 125i', 'Honda Beat'], compatYears: 'All Years', supplier: 'SUP-003', supplierRef: 'RGA-TIRE-9080', description: 'Tubeless scooter tire, common 90/80-14 fitment for front or rear.', costPrice: 1450, sellingPrice: 1950, stock: 12, reorderLevel: 6, image: 'other-parts', rubber: true, warrantyDays: RUBBER_WARRANTY_DAYS, warrantyType: 'Defects only', archived: false },
  { id: 'LGT-001', name: 'LED Headlight', brand: 'Generic', category: 'lights', compatibility: ['Yamaha NMAX', 'Honda Click 125i'], compatYears: '2018-2025', supplier: 'SUP-001', supplierRef: 'ABC-LH-201', description: 'Bright white LED headlight bulb upgrade with plug-and-play connector.', costPrice: 620, sellingPrice: 980, stock: 15, reorderLevel: 8, image: 'lights', archived: false },
  { id: 'LGT-002', name: 'Signal Light (Turn Signal)', brand: 'Generic', category: 'lights', compatibility: [UNIVERSAL_FIT], compatYears: 'All Years', supplier: 'SUP-001', supplierRef: 'ABC-SL-055', description: 'Amber turn signal lamp, universal mount bracket included.', costPrice: 90, sellingPrice: 180, stock: 40, reorderLevel: 15, image: 'lights', archived: false },
  { id: 'LGT-003', name: 'Tail Light Assembly', brand: 'Generic', category: 'lights', compatibility: ['Honda Click 125i'], compatYears: '2019-2024', supplier: 'SUP-001', supplierRef: 'ABC-TL-087', description: 'Complete rear tail light housing with brake and running light.', costPrice: 380, sellingPrice: 620, stock: 9, reorderLevel: 10, image: 'lights', archived: false },
  { id: 'LGT-004', name: 'Motorcycle Headlight Bulb H4', brand: 'Philips', category: 'lights', compatibility: [UNIVERSAL_FIT], compatYears: 'All Years', supplier: 'SUP-002', supplierRef: 'YGP-H4-012', description: 'Standard H4 halogen replacement bulb, 12V.', costPrice: 60, sellingPrice: 120, stock: 0, reorderLevel: 20, image: 'lights', archived: false },
  { id: 'ELC-001', name: 'Motorcycle Horn (12V Waterproof)', brand: 'Generic', category: 'electrical', compatibility: [UNIVERSAL_FIT], compatYears: 'All Years', supplier: 'SUP-003', supplierRef: 'RGA-HRN-009', description: 'Loud waterproof 12V horn, universal wiring.', costPrice: 140, sellingPrice: 280, stock: 22, reorderLevel: 10, image: 'electrical', archived: false },
  { id: 'ELC-002', name: 'USB Fast Charger Port', brand: 'Generic', category: 'electrical', compatibility: [UNIVERSAL_FIT], compatYears: 'All Years', supplier: 'SUP-003', supplierRef: 'RGA-USB-033', description: 'Waterproof handlebar-mount USB charging port for phones and dashcams.', costPrice: 110, sellingPrice: 250, stock: 35, reorderLevel: 12, image: 'electrical', archived: false },
  { id: 'ELC-003', name: 'LED Flasher Relay', brand: 'Generic', category: 'electrical', compatibility: [UNIVERSAL_FIT], compatYears: 'All Years', supplier: 'SUP-002', supplierRef: 'YGP-FR-041', description: '2-pin electronic flasher relay for LED signal light conversions.', costPrice: 55, sellingPrice: 130, stock: 4, reorderLevel: 10, image: 'electrical', archived: false },
  { id: 'ELC-004', name: 'Handlebar Switch Assembly (Left)', brand: 'Yamaha Genuine', category: 'electrical', compatibility: ['Yamaha Aerox', 'Yamaha NMAX'], compatYears: '2018-2024', supplier: 'SUP-002', supplierRef: 'YGP-SW-076', description: 'Left-side handlebar switch housing — horn, signal, and headlight controls.', costPrice: 250, sellingPrice: 480, stock: 11, reorderLevel: 8, image: 'electrical', archived: false },
  { id: 'ACC-001', name: 'Motorcycle Side Mirror (Pair)', brand: 'Generic', category: 'accessories', compatibility: [UNIVERSAL_FIT], compatYears: 'All Years', supplier: 'SUP-003', supplierRef: 'RGA-MIR-019', description: 'Universal-fit left and right side mirror set, standard 10mm thread.', costPrice: 180, sellingPrice: 350, stock: 26, reorderLevel: 10, image: 'accessories', archived: false }
];

/* ---------- Users ---------- */
const USERS = [
  { id: 'USR-001', name: 'Ronnie Manalo', username: 'ronnie.manalo', email: '[email protected]', role: 'Admin', status: 'Active', dateAdded: '2025-01-10' },
  { id: 'USR-002', name: 'Juan Dela Cruz', username: 'juan.delacruz', email: '[email protected]', role: 'Staff', status: 'Active', dateAdded: '2025-03-15' },
  { id: 'USR-003', name: 'Maria Santos', username: 'maria.santos', email: '[email protected]', role: 'Staff', status: 'Active', dateAdded: '2025-06-02' },
  { id: 'USR-004', name: 'Ana Reyes', username: 'ana.reyes', email: '[email protected]', role: 'Staff', status: 'Active', dateAdded: '2026-02-20' },
  { id: 'USR-005', name: 'Carlo Ibarra', username: 'carlo.ibarra', email: '[email protected]', role: 'Staff', status: 'Inactive', dateAdded: '2024-11-05' }
];

/* ---------- Deterministic RNG so demo data is stable on every load ---------- */
function makeRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ---------- Sales history (Aug 11 - Aug 30, 2026) ---------- */
function buildSales() {
  const rng = makeRng(20260830);
  const staffPool = ['Juan Dela Cruz', 'Maria Santos', 'Ana Reyes'];
  const paymentPool = ['Cash', 'Cash', 'Cash', 'GCash', 'GCash', 'Bank Transfer'];
  const weights = [
    ['LGT-001', 17], ['BRK-001', 13], ['LGT-002', 10], ['BRK-002', 7],
    ['ELC-002', 6], ['ACC-001', 5], ['ELC-001', 5], ['ENG-001', 4],
    ['LGT-003', 4], ['ENG-002', 3], ['ELC-003', 2], ['LGT-004', 2],
    ['OTH-001', 1], ['ENG-003', 1]
    /* ELC-004 intentionally has no weight entry — a genuine 0-sold slow mover */
  ];
  const totalWeight = weights.reduce((s, w) => s + w[1], 0);
  function pickProduct() {
    let r = rng() * totalWeight;
    for (const [id, w] of weights) {
      if (r < w) return id;
      r -= w;
    }
    return weights[0][0];
  }

  const sales = [];
  let counter = 1;
  for (let day = 11; day <= 30; day++) {
    const salesToday = 1 + Math.floor(rng() * 3);
    for (let n = 0; n < salesToday; n++) {
      const hour = 9 + Math.floor(rng() * 9);
      const minute = Math.floor(rng() * 60);
      const itemCount = 1 + Math.floor(rng() * 2);
      const chosenIds = new Set();
      while (chosenIds.size < itemCount) chosenIds.add(pickProduct());
      const items = Array.from(chosenIds).map(pid => {
        const product = PRODUCTS.find(p => p.id === pid);
        const qty = 1 + Math.floor(rng() * 4);
        return { productId: pid, name: product.name, qty, price: product.sellingPrice, subtotal: qty * product.sellingPrice };
      });
      const total = items.reduce((s, i) => s + i.subtotal, 0);
      const date = new Date(2026, 7, day, hour, minute, 0);
      sales.push({
        id: 'SALE-' + Utils.pad(counter, 4),
        date: date.toISOString(),
        items,
        total,
        paymentMethod: paymentPool[Math.floor(rng() * paymentPool.length)],
        staff: staffPool[Math.floor(rng() * staffPool.length)]
      });
      counter++;
    }
  }
  return sales;
}
const SALES = buildSales();

/* Customer motorcycle-unit purchases — appended to SALES (and used to seed
   Warranty records) so stock, sales totals, and warranty dates all agree. */
const CUSTOMERS = [
  { id: 'CUST-001', name: 'Carlos Mendoza', contactNumber: '0917-511-2234', email: '[email protected]', address: 'Commonwealth Ave, Quezon City', username: 'carlos.mendoza', dateRegistered: '2025-09-18', status: 'Active' },
  { id: 'CUST-002', name: 'Angelica Torres', contactNumber: '0918-622-3345', email: '[email protected]', address: 'Katipunan Ave, Quezon City', username: 'angelica.torres', dateRegistered: '2026-03-10', status: 'Active' },
  { id: 'CUST-003', name: 'Paolo Ramirez', contactNumber: '0919-733-4456', email: '[email protected]', address: 'Marcos Highway, Marikina City', username: 'paolo.ramirez', dateRegistered: '2024-06-05', status: 'Active' },
  { id: 'CUST-004', name: 'Michael Aquino', contactNumber: '0920-844-5567', email: '[email protected]', address: 'Aurora Blvd, Quezon City', username: 'michael.aquino', dateRegistered: '2025-01-10', status: 'Active' },
  { id: 'CUST-005', name: 'Jasmine Bautista', contactNumber: '0921-955-6678', email: '[email protected]', address: 'Visayas Ave, Quezon City', username: 'jasmine.bautista', dateRegistered: '2026-07-02', status: 'Active' },
  { id: 'CUST-006', name: 'Bianca Flores', contactNumber: '0922-066-7789', email: '[email protected]', address: 'Tandang Sora Ave, Quezon City', username: 'bianca.flores', dateRegistered: '2026-08-14', status: 'Active' }
];
/* The three motorcycle units that used to be listed. They are NOT products any more (not in Inventory
   or POS); this only lets the seeded past sales (SALE-MOT-...) keep their names and prices. */
const RETIRED_MOTORCYCLE_UNITS = [
  { id: 'MOT-001', name: 'Honda Click 125i', sellingPrice: 89000 },
  { id: 'MOT-002', name: 'Yamaha NMAX', sellingPrice: 149000 },
  { id: 'MOT-003', name: 'Suzuki Raider R150', sellingPrice: 114000 }
];
const MOTORCYCLE_SALES = [
  { customerId: 'CUST-001', productId: 'MOT-001', date: '2025-09-18T10:15:00', staff: 'Juan Dela Cruz', payment: 'Bank Transfer' },
  { customerId: 'CUST-002', productId: 'MOT-002', date: '2026-03-10T14:40:00', staff: 'Maria Santos', payment: 'Bank Transfer' },
  { customerId: 'CUST-003', productId: 'MOT-003', date: '2024-06-05T11:00:00', staff: 'Juan Dela Cruz', payment: 'Cash' },
  { customerId: 'CUST-004', productId: 'MOT-001', date: '2025-01-10T09:30:00', staff: 'Ana Reyes', payment: 'GCash' }
];
MOTORCYCLE_SALES.forEach((m, i) => {
  const product = PRODUCTS.concat(RETIRED_MOTORCYCLE_UNITS).find(p => p.id === m.productId);
  SALES.push({
    id: 'SALE-MOT-' + Utils.pad(i + 1, 3),
    date: new Date(m.date).toISOString(),
    items: [{ productId: product.id, name: product.name, qty: 1, price: product.sellingPrice, subtotal: product.sellingPrice }],
    total: product.sellingPrice,
    paymentMethod: m.payment,
    staff: m.staff,
    customerId: m.customerId
  });
});

/* ---------- Inventory history, computed backward from current stock
   so the numbers always reconcile (opening stock + all moves = current stock) ---------- */
const MANUAL_INVENTORY_EVENTS = [
  { productId: 'LGT-001', type: 'Stock In', quantity: 20, date: '2026-08-18T09:15:00', user: 'Juan Dela Cruz', supplierId: 'SUP-001', reference: 'PO-1041', notes: 'Restock delivery from MotoParts Central Trading' },
  { productId: 'BRK-001', type: 'Stock In', quantity: 15, date: '2026-08-15T10:00:00', user: 'Maria Santos', supplierId: 'SUP-001', reference: 'PO-1038', notes: 'Restock delivery from MotoParts Central Trading' },
  { productId: 'ACC-001', type: 'Stock In', quantity: 10, date: '2026-08-12T08:30:00', user: 'Maria Santos', supplierId: 'SUP-003', reference: 'PO-1035', notes: 'Restock delivery from RoadGear Accessories Supply' },
  { productId: 'OTH-001', type: 'Stock Out', quantity: 1, date: '2026-08-22T13:40:00', user: 'Ana Reyes', reason: 'Damaged', notes: 'Damaged during handling — written off' },
  { productId: 'ELC-003', type: 'Stock Out', quantity: 2, date: '2026-08-25T11:20:00', user: 'Juan Dela Cruz', reason: 'Returned', notes: 'Defective units returned to supplier' }
];

function buildInventoryTransactions() {
  const transactions = [];
  let counter = 1;
  const openingDate = new Date(2026, 7, 9, 8, 0, 0);

  PRODUCTS.forEach(p => {
    const saleMoves = SALES.flatMap(s => s.items
      .filter(i => i.productId === p.id && s.id.indexOf('SALE-MOT-') !== 0)
      .map(i => ({ date: s.date, type: 'Sale', qty: -i.qty, user: s.staff, reason: 'Sold', notes: 'Sold via POS (' + s.id + ')' })));
    const manualMoves = MANUAL_INVENTORY_EVENTS
      .filter(e => e.productId === p.id)
      .map(e => ({ date: e.date, type: e.type, qty: e.type === 'Stock In' ? e.quantity : -e.quantity, user: e.user, supplierId: e.supplierId, reference: e.reference, reason: e.reason, notes: e.notes }));
    const moves = saleMoves.concat(manualMoves).sort((a, b) => new Date(a.date) - new Date(b.date));
    const netMovement = moves.reduce((sum, m) => sum + m.qty, 0);
    let running = p.stock - netMovement;

    transactions.push({
      id: 'TRX-' + Utils.pad(counter++, 4),
      productId: p.id, productName: p.name, type: 'Stock In',
      quantity: running, previousStock: 0, newStock: running,
      date: openingDate.toISOString(), user: 'Juan Dela Cruz', supplierId: p.supplier, reference: 'Opening count', reason: null, notes: 'Opening stock count'
    });

    moves.forEach(m => {
      const prev = running;
      running += m.qty;
      transactions.push({
        id: 'TRX-' + Utils.pad(counter++, 4),
        productId: p.id, productName: p.name, type: m.type,
        quantity: m.qty, previousStock: prev, newStock: running,
        date: m.date, user: m.user, supplierId: m.supplierId || null, reference: m.reference || null, reason: m.reason || null, notes: m.notes
      });
    });
  });

  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}
const INVENTORY_TRANSACTIONS = buildInventoryTransactions();

/* Derive each product's last-touched date from its own transaction history
   so "Last Updated" reflects real activity instead of a fixed placeholder. */
PRODUCTS.forEach(p => {
  const own = INVENTORY_TRANSACTIONS.filter(t => t.productId === p.id);
  p.lastUpdated = own.length ? own[0].date : new Date(2026, 7, 9, 8, 0, 0).toISOString();
});

/* ---------- Notifications, derived from current stock vs reorder level ---------- */
function buildNotifications() {
  const notifs = [];
  let n = 1;
  PRODUCTS.forEach(p => {
    const status = Utils.getStockStatus(p.stock, p.reorderLevel);
    if (status === 'Out of Stock') {
      notifs.push({ id: 'NTF-' + Utils.pad(n++, 3), type: 'out-of-stock', productId: p.id, title: 'Out of Stock', message: p.name + ' is now out of stock.', date: '2026-08-29T16:20:00', read: false });
    } else if (status === 'Low Stock') {
      notifs.push({ id: 'NTF-' + Utils.pad(n++, 3), type: 'low-stock', productId: p.id, title: 'Low Stock', message: p.name + ' has ' + p.stock + (p.stock === 1 ? ' unit' : ' units') + ' remaining.', date: '2026-08-29T09:00:00', read: false });
    } else if (p.stock <= p.reorderLevel * 1.5) {
      notifs.push({ id: 'NTF-' + Utils.pad(n++, 3), type: 'restock-reminder', productId: p.id, title: 'Restock Reminder', message: p.name + ' is approaching its reorder level.', date: '2026-08-28T09:00:00', read: false });
    }
  });
  return notifs.sort((a, b) => new Date(b.date) - new Date(a.date));
}
const NOTIFICATIONS = buildNotifications();

/* ---------- Customer product interest (views) ---------- */
const PRODUCT_VIEWS = {
  'LGT-001': { today: 24, week: 137, month: 512 },
  'BRK-001': { today: 18, week: 91, month: 340 },
  'LGT-002': { today: 12, week: 68, month: 245 },
  'BRK-002': { today: 9, week: 54, month: 198 },
  'ELC-002': { today: 8, week: 47, month: 176 },
  'ACC-001': { today: 6, week: 39, month: 150 },
  'ELC-001': { today: 5, week: 33, month: 128 },
  'LGT-003': { today: 4, week: 26, month: 97 },
  'ENG-001': { today: 4, week: 24, month: 88 },
  'ENG-002': { today: 3, week: 19, month: 71 },
  'ELC-003': { today: 2, week: 14, month: 55 },
  'LGT-004': { today: 2, week: 12, month: 44 },
  'OTH-001': { today: 1, week: 7, month: 26 },
  'ENG-003': { today: 1, week: 5, month: 19 },
  'ELC-004': { today: 0, week: 2, month: 9 }
};

/* ---------- Assembled default "database" ---------- */
const WARRANTIES = [
  { id: 'WAR-001', customerId: 'CUST-001', productId: 'MOT-001', productName: 'Honda Click 125i', purchaseDate: '2025-09-18', warrantyStart: '2025-09-18', warrantyExpiration: '2026-09-18', coverage: 'Engine and transmission \u2014 1 year or 10,000 km, whichever comes first', status: 'Expiring Soon', claims: [] },
  { id: 'WAR-002', customerId: 'CUST-002', productId: 'MOT-002', productName: 'Yamaha NMAX', purchaseDate: '2026-03-10', warrantyStart: '2026-03-10', warrantyExpiration: '2027-03-10', coverage: 'Engine, transmission, and electrical \u2014 1 year or 10,000 km, whichever comes first', status: 'Active', claims: [] },
  { id: 'WAR-003', customerId: 'CUST-003', productId: 'MOT-003', productName: 'Suzuki Raider R150', purchaseDate: '2024-06-05', warrantyStart: '2024-06-05', warrantyExpiration: '2025-06-05', coverage: 'Engine and transmission \u2014 1 year or 10,000 km, whichever comes first', status: 'Expired', claims: [] },
  { id: 'WAR-004', customerId: 'CUST-004', productId: 'MOT-001', productName: 'Honda Click 125i', purchaseDate: '2025-01-10', warrantyStart: '2025-01-10', warrantyExpiration: '2026-01-10', coverage: 'Engine and transmission \u2014 1 year or 10,000 km, whichever comes first', status: 'Claimed', claims: [
    { date: '2025-08-02', description: 'Unusual engine noise on cold start', resolution: 'Replaced starter clutch under warranty at MotoParts Central Trading service bay.' }
  ] },
  /* Rubber items (tires): defect-only warranty, RUBBER_WARRANTY_DAYS (7) days from purchase */
  { id: 'WAR-005', customerId: 'CUST-005', productId: 'OTH-001', purchaseDate: '2026-08-12', warrantyStart: '2026-08-12', warrantyExpiration: Utils.addDaysISO('2026-08-12', RUBBER_WARRANTY_DAYS), coverage: RUBBER_WARRANTY_COVERAGE, status: 'Expired', claims: [] },
  { id: 'WAR-006', customerId: 'CUST-006', productId: 'OTH-001', purchaseDate: '2026-08-27', warrantyStart: '2026-08-27', warrantyExpiration: Utils.addDaysISO('2026-08-27', RUBBER_WARRANTY_DAYS), coverage: RUBBER_WARRANTY_COVERAGE, status: 'Expiring Soon', claims: [] }
];

const DEFAULT_DB = {
  categories: CATEGORIES,
  brands: MOTO_BRANDS,
  suppliers: SUPPLIERS,
  products: PRODUCTS,
  users: USERS,
  sales: SALES,
  inventoryTransactions: INVENTORY_TRANSACTIONS,
  notifications: NOTIFICATIONS,
  productViews: PRODUCT_VIEWS,
  customers: CUSTOMERS,
  warranties: WARRANTIES
};