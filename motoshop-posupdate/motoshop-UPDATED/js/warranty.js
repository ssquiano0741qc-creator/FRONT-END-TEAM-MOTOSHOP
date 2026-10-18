/* ==========================================================================
   warranty.js — powers warranty.html
   ========================================================================== */
(function () {
  if (!initShell('warranty')) return;

  function warrantyBadgeClass(status) {
    if (status === 'Active') return 'badge-ok';
    if (status === 'Expiring Soon') return 'badge-warn';
    if (status === 'Expired') return 'badge-danger';
    return 'badge-neutral';
  }

  function renderStats() {
    const warranties = Store.get('warranties', []);
    const counts = { Active: 0, 'Expiring Soon': 0, Expired: 0, Claimed: 0 };
    warranties.forEach(function (w) { counts[w.status] = (counts[w.status] || 0) + 1; });
    const stats = [
      { label: 'Active', value: counts.Active, iconName: 'shield', tone: 'ok' },
      { label: 'Expiring Soon', value: counts['Expiring Soon'], iconName: 'clock', tone: 'warn' },
      { label: 'Expired', value: counts.Expired, iconName: 'xCircle', tone: 'danger' },
      { label: 'Claimed', value: counts.Claimed, iconName: 'checkCircle', tone: 'accent' }
    ];
    document.getElementById('warStatGrid').innerHTML = stats.map(function (s) {
      return '<div class="stat-card tone-' + s.tone + '"><div class="stat-icon tone-' + s.tone + '">' + icon(s.iconName) + '</div>' +
        '<div class="stat-label">' + s.label + '</div><div class="stat-value">' + s.value + '</div></div>';
    }).join('');
  }

  function renderTable() {
    const q = document.getElementById('warSearch').value.trim().toLowerCase();
    const statusFilter = document.getElementById('warFilterStatus').value;
    const customers = Store.get('customers', []);
    const products = Store.get('products', []);
    let rows = Store.get('warranties', []).map(function (w) {
      return { w: w, customer: customers.find(function (c) { return c.id === w.customerId; }), product: products.find(function (p) { return p.id === w.productId; }) || { name: w.productName || 'Motorcycle' } };
    });
    rows = rows.filter(function (r) {
      if (statusFilter && r.w.status !== statusFilter) return false;
      if (q && r.customer.name.toLowerCase().indexOf(q) === -1 && r.product.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    const tbody = document.getElementById('warrantyTbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">' + icon('shield') + '<h3>No warranty records found</h3></div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      return '<tr><td style="font-weight:600;color:var(--ink);">' + Utils.escapeHtml(r.customer.name) + '</td>' +
        '<td>' + Utils.escapeHtml(r.product.name) + '</td>' +
        '<td class="text-muted">' + Utils.formatDate(r.w.purchaseDate) + '</td>' +
        '<td class="text-muted">' + Utils.formatDate(r.w.warrantyExpiration) + '</td>' +
        '<td><span class="badge ' + warrantyBadgeClass(r.w.status) + '">' + r.w.status + '</span></td>' +
        '<td><button class="icon-btn" title="View" data-view="' + r.w.id + '">' + icon('eye') + '</button></td></tr>';
    }).join('');
  }

  function openWarrantyView(warrantyId) {
    const w = Store.get('warranties', []).find(function (x) { return x.id === warrantyId; });
    if (!w) return;
    const c = Store.get('customers', []).find(function (x) { return x.id === w.customerId; });
    const p = Store.get('products', []).find(function (x) { return x.id === w.productId; }) || { name: w.productName || 'Motorcycle' };
    document.getElementById('warrantyViewBody').innerHTML =
      '<div class="flex justify-between items-center" style="margin-bottom:14px;"><h2 style="margin:0;">' + Utils.escapeHtml(p.name) + '</h2><span class="badge ' + warrantyBadgeClass(w.status) + '">' + w.status + '</span></div>' +
      '<div class="form-grid">' +
        '<div><div class="hint" style="font-weight:700;text-transform:uppercase;">Customer</div><div style="font-weight:600;">' + Utils.escapeHtml(c.name) + '</div></div>' +
        '<div><div class="hint" style="font-weight:700;text-transform:uppercase;">Contact</div><div style="font-weight:600;">' + Utils.escapeHtml(c.contactNumber) + '</div></div>' +
        '<div><div class="hint" style="font-weight:700;text-transform:uppercase;">Purchase Date</div><div style="font-weight:600;">' + Utils.formatDate(w.purchaseDate) + '</div></div>' +
        '<div><div class="hint" style="font-weight:700;text-transform:uppercase;">Warranty Start</div><div style="font-weight:600;">' + Utils.formatDate(w.warrantyStart) + '</div></div>' +
        '<div><div class="hint" style="font-weight:700;text-transform:uppercase;">Expiration</div><div style="font-weight:600;">' + Utils.formatDate(w.warrantyExpiration) + '</div></div>' +
        (Utils.isRubberItem(p) ? '<div><div class="hint" style="font-weight:700;text-transform:uppercase;">Warranty Period</div><div style="font-weight:600;">' + RUBBER_WARRANTY_DAYS + ' days \u2014 defects only</div></div>' : '') +
        '<div class="span-2"><div class="hint" style="font-weight:700;text-transform:uppercase;">Coverage</div><div style="font-weight:600;">' + Utils.escapeHtml(w.coverage) + '</div></div>' +
      '</div>' +
      '<h3 style="font-size:.9rem;margin-top:18px;">Claim History</h3>' +
      (w.claims.length
        ? w.claims.map(function (cl) {
            return '<div style="padding:10px 0;border-bottom:1px solid var(--border);"><div style="font-weight:600;font-size:.85rem;color:var(--ink);">' + Utils.formatDate(cl.date) + ' \u2014 ' + Utils.escapeHtml(cl.description) + '</div><div class="text-muted" style="font-size:.82rem;margin-top:2px;">' + Utils.escapeHtml(cl.resolution) + '</div></div>';
          }).join('')
        : '<p class="hint">No claims filed.</p>');
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderStats();
    renderTable();
    document.getElementById('warSearch').addEventListener('input', renderTable);
    document.getElementById('warFilterStatus').addEventListener('change', renderTable);
    document.getElementById('warrantyTbody').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-view]');
      if (btn) { openWarrantyView(btn.dataset.view); document.getElementById('warrantyViewOverlay').classList.add('open'); }
    });
    document.querySelectorAll('[data-close]').forEach(function (btn) { btn.addEventListener('click', function () { document.getElementById(btn.dataset.close).classList.remove('open'); }); });
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('open'); });
    });
  });
})();