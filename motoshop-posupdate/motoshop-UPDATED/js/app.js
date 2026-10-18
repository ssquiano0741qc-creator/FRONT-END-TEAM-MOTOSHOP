/* ==========================================================================
   app.js
   ----------------------------------------------------------------------
   Shared shell for the internal (Admin/Staff) pages: icon set, session
   handling, sidebar + topbar rendering, mobile drawer, account menu,
   toasts. Included on every page — the DOM lookups are all defensive so
   it's harmless to load on pages that don't use every piece.
   ========================================================================== */

/* ---------- Icon set: plain SVG inner-markup, no build step needed ---------- */
const Icons = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  inventory: '<polygon points="12,3 21,7.5 21,16.5 12,21 3,16.5 3,7.5"/><polyline points="3,7.5 12,12 21,7.5"/><line x1="12" y1="12" x2="12" y2="21"/>',
  pos: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><polyline points="1,3 4,3 6.5,15 18,15 20,7 5.5,7"/>',
  sales: '<line x1="5" y1="20" x2="5" y2="11"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="19" y1="20" x2="19" y2="14"/>',
  suppliers: '<rect x="1" y="7" width="13" height="9" rx="1"/><polygon points="14,10 18,10 21,13 21,16 14,16"/><circle cx="6" cy="18.5" r="1.7"/><circle cx="17" cy="18.5" r="1.7"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><polyline points="2,20 2,19 4,15 14,15 16,19 16,20"/><circle cx="18" cy="9" r="2.6"/><polyline points="16.5,20 16.5,18.5 18,15.5 22,15.5"/>',
  bell: '<polygon points="12,3.2 8,8 8,13.2 5,16 19,16 16,13.2 16,8"/><rect x="10" y="18" width="4" height="2.4" rx="1.2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.3" y1="15.3" x2="21" y2="21"/>',
  hamburger: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  close: '<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>',
  chevronDown: '<polyline points="6,9 12,15 18,9"/>',
  chevronRight: '<polyline points="9,6 15,12 9,18"/>',
  chevronLeft: '<polyline points="15,6 9,12 15,18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<polygon points="3,17.5 3,21 6.5,21 17,10.5 13.5,7 3,17.5"/><line x1="16" y1="4" x2="20" y2="8"/><line x1="13.5" y1="7" x2="17" y2="10.5"/>',
  eye: '<polygon points="12,5 22,12 12,19 2,12"/><circle cx="12" cy="12" r="3"/>',
  stockIn: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="6,11 12,5 18,11"/>',
  stockOut: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="6,13 12,19 18,13"/>',
  history: '<circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 16,14"/>',
  filter: '<polygon points="3,4 21,4 14,12.5 14,19 10,21 10,12.5"/>',
  logout: '<rect x="3" y="4" width="9" height="16" rx="1.5"/><line x1="10" y1="12" x2="21" y2="12"/><polyline points="17,8 21,12 17,16"/>',
  refresh: '<polyline points="3,4 3,9 8,9"/><polyline points="21,20 21,15 16,15"/><polyline points="3,9 7,5.5 12,4.5 17,6 20,9.5"/><polyline points="21,15 17,18.5 12,19.5 7,18 4,14.5"/>',
  mail: '<rect x="2" y="5" width="20" height="14" rx="1.5"/><polyline points="2,7 12,14 22,7"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><line x1="10" y1="18" x2="14" y2="18"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><polyline points="7.5,12.5 10.5,15.5 16.5,9"/>',
  alertTriangle: '<polygon points="12,3 22,20 2,20"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17" r="0.9"/>',
  xCircle: '<circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>',
  infoCircle: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="7.5" r="0.9"/>',
  cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><polyline points="1,3 4,3 6.5,15 18,15 20,7 5.5,7"/>',
  share: '<circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><line x1="8.2" y1="10.8" x2="15.8" y2="6.2"/><line x1="8.2" y1="13.2" x2="15.8" y2="17.8"/>',
  link: '<rect x="2" y="8" width="9" height="8" rx="4"/><rect x="13" y="8" width="9" height="8" rx="4"/><line x1="9" y1="12" x2="15" y2="12"/>',
  tag: '<polygon points="12,2 21,2 21,11 12,20 3,11 3,2"/><circle cx="16.5" cy="6.5" r="1.4"/>',
  trendUp: '<polyline points="3,17 9,11 13,15 21,6"/><polyline points="15,6 21,6 21,12"/>',
  download: '<line x1="12" y1="3" x2="12" y2="14"/><polyline points="7,10 12,15 17,10"/><line x1="4" y1="19" x2="20" y2="19"/>',
  camera: '<rect x="2" y="7" width="20" height="14" rx="2"/><polygon points="8,7 10,4 14,4 16,7"/><circle cx="12" cy="14" r="4"/>',
  motorcycle: '<circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><polyline points="5,18 9,10 14,10 19,18"/><line x1="9" y1="10" x2="7" y2="6"/><line x1="14" y1="10" x2="16" y2="7"/>',
  box: '<polygon points="12,3 21,7.5 21,16.5 12,21 3,16.5 3,7.5"/><polyline points="3,7.5 12,12 21,7.5"/><line x1="12" y1="12" x2="12" y2="21"/>',
  archive: '<rect x="2" y="4" width="20" height="5" rx="1"/><rect x="4" y="9" width="16" height="11" rx="1"/><line x1="10" y1="13" x2="14" y2="13"/>',
  shield: '<polygon points="12,3 20,6.5 20,12 12,21 4,12 4,6.5"/><polyline points="8.5,11.5 11,14 15.5,8.5"/>',
  userPlus: '<circle cx="9" cy="8" r="3.4"/><polyline points="2,20 2,19 4,15 14,15 16,19 16,20"/><line x1="18" y1="8" x2="18" y2="14"/><line x1="15" y1="11" x2="21" y2="11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 16,14"/>'
};
function icon(name, cls) {
  return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24">' + (Icons[name] || '') + '</svg>';
}

/* ---------- Seed Store from DEFAULT_DB (idempotent — never overwrites live edits) ---------- */
function seedStore() {
  Store.seedAll({
    categories: DEFAULT_DB.categories,
    products: DEFAULT_DB.products,
    suppliers: DEFAULT_DB.suppliers,
    users: DEFAULT_DB.users,
    sales: DEFAULT_DB.sales,
    inventoryTransactions: DEFAULT_DB.inventoryTransactions,
    notifications: DEFAULT_DB.notifications,
    productViews: DEFAULT_DB.productViews,
    customers: DEFAULT_DB.customers,
    warranties: DEFAULT_DB.warranties
  });
  removeMotorcycleListings();
}

/* One-time cleanup for browsers that already hold the older demo data. Complete motorcycles are no longer
   sold through the catalog, so the "Motorcycles" category and any listing in it are removed (Inventory,
   POS and the category lists all read the same Store). History is kept on purpose: past sales and stock
   movements carry their own product names, and each warranty record gets the motorcycle's name copied onto
   it before the listing goes, so the Warranty page and Dashboard keep working. Runs once (see 'migrations'). */
function removeMotorcycleListings() {
  const MIGRATION = 'remove-motorcycle-listings-v1';
  const done = Store.get('migrations', []);
  if (done.indexOf(MIGRATION) !== -1) return;

  const products = Store.get('products', []);
  const removed = products.filter(function (p) { return p.category === 'motorcycles'; });
  if (removed.length) {
    const warranties = Store.get('warranties', []);
    warranties.forEach(function (w) {
      const unit = removed.find(function (p) { return p.id === w.productId; });
      if (unit && !w.productName) w.productName = unit.name;
    });
    Store.set('warranties', warranties);
    Store.set('products', products.filter(function (p) { return p.category !== 'motorcycles'; }));
    const goneIds = removed.map(function (p) { return p.id; });
    Store.set('notifications', Store.get('notifications', []).filter(function (n) { return goneIds.indexOf(n.productId) === -1; }));
  }
  Store.set('categories', Store.get('categories', []).filter(function (c) { return c.id !== 'motorcycles'; }));

  done.push(MIGRATION);
  Store.set('migrations', done);
}

function resetDemoData() {
  Store.resetAll({
    categories: DEFAULT_DB.categories,
    products: DEFAULT_DB.products,
    suppliers: DEFAULT_DB.suppliers,
    users: DEFAULT_DB.users,
    sales: DEFAULT_DB.sales,
    inventoryTransactions: DEFAULT_DB.inventoryTransactions,
    notifications: DEFAULT_DB.notifications,
    productViews: DEFAULT_DB.productViews,
    customers: DEFAULT_DB.customers,
    warranties: DEFAULT_DB.warranties
  });
  window.location.reload();
}

/* ---------- Session (prototype-only — a real backend would issue a token) ----------
   Dual-write to sessionStorage + localStorage so login survives the redirect
   even on file:// origins where localStorage can be flaky. */
const SESSION_KEY = 'motoshop:session';

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.role) return parsed;
    }
  } catch (e) { /* ignore */ }
  const fromStore = Store.get('session', null);
  if (fromStore && fromStore.role) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(fromStore)); } catch (e) { /* ignore */ }
    return fromStore;
  }
  return null;
}

function setSession(user) {
  const payload = user && user.role ? user : null;
  try {
    if (payload) sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch (e) { /* ignore */ }
  Store.set('session', payload);
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  Store.set('session', null);
}

function requireSession() {
  const session = getSession();
  if (!session || !session.role) {
    window.location.replace('login.html');
    return null;
  }
  return session;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ---------- Toasts ---------- */
/* ---------- Form validation (inline, styled — no native browser popups) ---------- */
function validateForm(formEl) {
  let isValid = true;
  let firstInvalid = null;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  formEl.querySelectorAll('[required]').forEach(function (input) {
    const field = input.closest('.field');
    let fieldValid = true;
    const val = (input.value || '').trim();

    if (input.type === 'radio') {
      const group = formEl.querySelectorAll('[name="' + input.name + '"]');
      fieldValid = Array.prototype.some.call(group, function (r) { return r.checked; });
    } else if (!val) {
      fieldValid = false;
    } else if (input.type === 'email' && !emailRe.test(val)) {
      fieldValid = false;
    } else if (input.type === 'number' && (isNaN(val) || (input.min !== '' && Number(val) < Number(input.min)))) {
      fieldValid = false;
    } else if (input.pattern && val) {
      const re = new RegExp('^(?:' + input.pattern + ')$');
      if (!re.test(val)) fieldValid = false;
    }

    if (field) {
      field.classList.toggle('has-error', !fieldValid);
      let msg = field.querySelector('.field-error-msg');
      if (!fieldValid) {
        if (!msg) {
          msg = document.createElement('div');
          msg.className = 'field-error-msg';
          field.appendChild(msg);
        }
        msg.innerHTML = icon('alertTriangle') + '<span>' + (input.dataset.errorMsg ||
          (input.type === 'email' ? 'Enter a valid email address.' : 'This field is required.')) + '</span>';
      } else if (msg) {
        msg.remove();
      }
    }
    if (!fieldValid) {
      isValid = false;
      if (!firstInvalid) firstInvalid = input;
    }
  });

  if (firstInvalid) firstInvalid.focus();
  return isValid;
}
// Clear a field's error as soon as the person starts fixing it.
document.addEventListener('input', function (e) {
  const field = e.target.closest && e.target.closest('.field.has-error');
  if (!field) return;
  const val = (e.target.value || '').trim();
  if (val) {
    field.classList.remove('has-error');
    const msg = field.querySelector('.field-error-msg');
    if (msg) msg.remove();
  }
});

function showToast(message, type) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }
  const iconName = type === 'danger' ? 'xCircle' : type === 'info' ? 'infoCircle' : 'checkCircle';
  const el = document.createElement('div');
  el.className = 'toast toast-' + (type || 'ok');
  el.innerHTML = icon(iconName) + '<div class="msg">' + Utils.escapeHtml(message) + '</div>';
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .2s ease';
    setTimeout(() => el.remove(), 220);
  }, 3200);
}

/* ---------- Sidebar / topbar for internal pages ---------- */
const NAV_ITEMS = {
  Admin: [
    { key: 'dashboard', href: 'index.html', label: 'Dashboard', iconName: 'dashboard' },
    { key: 'inventory', href: 'inventory.html', label: 'Inventory', iconName: 'inventory' },
    { key: 'pos', href: 'pos.html', label: 'POS', iconName: 'pos' },
    { key: 'sales', href: 'sales.html', label: 'Sales', iconName: 'sales' },
    { key: 'warranty', href: 'warranty.html', label: 'Warranty', iconName: 'shield' },
    { key: 'suppliers', href: 'suppliers.html', label: 'Suppliers', iconName: 'suppliers' },
    { key: 'users', href: 'users.html', label: 'Users', iconName: 'users' }
  ],
  Staff: [
    { key: 'dashboard', href: 'index.html', label: 'Dashboard', iconName: 'dashboard' },
    { key: 'inventory', href: 'inventory.html', label: 'Inventory', iconName: 'inventory' },
    { key: 'pos', href: 'pos.html', label: 'POS', iconName: 'pos' },
    { key: 'sales', href: 'sales.html', label: 'Sales', iconName: 'sales' },
    { key: 'warranty', href: 'warranty.html', label: 'Warranty', iconName: 'shield' }
  ]
};

function renderSidebar(activeKey) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const session = requireSession();
  if (!session) return;
  const items = NAV_ITEMS[session.role] || NAV_ITEMS.Staff;
  const products = Store.get('products', []);
  const lowStockCount = Analytics.lowStockProducts(products).length + Analytics.outOfStockProducts(products).length;

  sidebar.innerHTML =
    '<div class="sidebar-brand">' +
      '<div class="brand-mark">' + icon('motorcycle') + '</div>' +
      '<div class="brand-text">TeamMotor<span>Parts &amp; Accessories</span></div>' +
    '</div>' +
    '<div class="nav-group-label">Menu</div>' +
    items.map(item =>
      '<a class="nav-item' + (item.key === activeKey ? ' active' : '') + '" href="' + item.href + '" title="' + item.label + '">' +
        icon(item.iconName) + '<span>' + item.label + '</span>' +
        (item.key === 'inventory' && lowStockCount > 0 ? '<span class="nav-badge">' + lowStockCount + '</span>' : '') +
      '</a>'
    ).join('') +
    '<div class="sidebar-footer">' +
      '<div class="sidebar-user">' +
        '<div class="avatar">' + initials(session.name) + '</div>' +
        '<div class="who"><strong>' + Utils.escapeHtml(session.name) + '</strong><span>' + session.role + '</span></div>' +
      '</div>' +
    '</div>';

  const scrim = document.getElementById('sidebarScrim');
  if (scrim) {
    sidebar.querySelectorAll('.nav-item').forEach(a => a.addEventListener('click', closeMobileSidebar));
  }
}

function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebarScrim');
  if (sidebar) sidebar.classList.add('open');
  if (scrim) scrim.classList.add('open');
}
function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebarScrim');
  if (sidebar) sidebar.classList.remove('open');
  if (scrim) scrim.classList.remove('open');
}

function renderTopbarActions() {
  const mount = document.getElementById('topbarActions');
  if (!mount) return;
  const session = getSession();
  if (!session) return;
  mount.innerHTML =
    '<div class="notif-btn account-menu" id="notifWrap">' +
      '<button class="icon-btn" id="notifBell" aria-label="Notifications">' + icon('bell') + '<span id="notifDot"></span></button>' +
      '<div class="notif-panel" id="notifPanel"></div>' +
    '</div>' +
    '<div class="account-menu" id="accountWrap">' +
      '<button class="account-trigger" id="accountTrigger">' +
        '<span class="avatar">' + initials(session.name) + '</span>' +
        icon('chevronDown') +
      '</button>' +
      '<div class="account-dropdown" id="accountDropdown">' +
        '<button type="button" id="resetDemoBtn">' + icon('refresh') + ' Reset demo data</button>' +
        '<hr>' +
        '<button type="button" id="logoutBtn">' + icon('logout') + ' Log out</button>' +
      '</div>' +
    '</div>';

  document.getElementById('accountTrigger').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('accountDropdown').classList.toggle('open');
    document.getElementById('notifPanel').classList.remove('open');
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'login.html';
  });
  document.getElementById('resetDemoBtn').addEventListener('click', () => {
    if (confirm('Reset all demo data back to the starting sample set? This clears any products, sales, or stock changes you made in this browser.')) {
      resetDemoData();
    }
  });
  document.addEventListener('click', () => {
    document.getElementById('accountDropdown').classList.remove('open');
  });
}

function requireRole(role) {
  const session = getSession();
  if (!session) return false;
  if (session.role !== role) {
    const page = document.querySelector('.page');
    if (page) {
      page.innerHTML =
        '<div class="empty-state card" style="max-width:420px;margin:60px auto;">' +
          icon('alertTriangle') +
          '<h3>Admin access required</h3>' +
          '<p>You&rsquo;re signed in as ' + Utils.escapeHtml(session.name) + ' (' + session.role + '). This page is limited to Admin/Owner accounts.</p>' +
          '<a class="btn btn-primary" href="index.html">Go to Dashboard</a>' +
        '</div>';
    }
    return false;
  }
  return true;
}

/* ---------- Sidebar collapse: grey round arrow button on the sidebar's right edge ----------
   Points left while the sidebar is open (click to minimize) and right while it is
   minimized (click to maximize). The choice is remembered per browser so moving
   between pages doesn't snap the sidebar back open. UI preference only — it
   deliberately does not go through Store, which is reserved for shop data. */
const SIDEBAR_COLLAPSED_KEY = 'motoshop:sidebarCollapsed';

function initSidebarToggle() {
  const shell = document.querySelector('.app-shell');
  if (!shell || document.getElementById('sidebarToggle')) return;
  let collapsed = false;
  try { collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch (e) { /* ignore */ }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'sidebarToggle';
  btn.className = 'sidebar-toggle';
  shell.appendChild(btn);

  function apply() {
    shell.classList.toggle('is-collapsed', collapsed);
    btn.innerHTML = icon(collapsed ? 'chevronRight' : 'chevronLeft');
    btn.setAttribute('aria-label', collapsed ? 'Maximize sidebar' : 'Minimize sidebar');
    btn.setAttribute('aria-expanded', String(!collapsed));
  }
  btn.addEventListener('click', function () {
    collapsed = !collapsed;
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch (e) { /* ignore */ }
    apply();
  });
  apply();
}

function initShell(activeKey) {
  seedStore();
  if (!requireSession()) return false;
  initSidebarToggle();
  renderSidebar(activeKey);
  renderTopbarActions();
  const hamburger = document.getElementById('hamburgerBtn');
  if (hamburger) hamburger.addEventListener('click', openMobileSidebar);
  const scrim = document.getElementById('sidebarScrim');
  if (scrim) scrim.addEventListener('click', closeMobileSidebar);
  if (window.Notifications) Notifications.init();
  return true;
}
