/* ==========================================================================
   suppliers.js — powers suppliers.html (Admin only)
   ========================================================================== */
(function () {
  if (!initShell('suppliers')) return;
  if (!requireRole('Admin')) return;

  let editingSupplierId = null;

  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }
  function viewField(label, value) {
    return '<div><div class="hint" style="margin:0 0 3px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">' + label + '</div><div style="font-weight:600;color:var(--ink);font-size:.9rem;">' + value + '</div></div>';
  }
  function productsSuppliedBy(supplierId) {
    return Store.get('products', []).filter(p => p.supplier === supplierId);
  }

  function renderTable() {
    const q = document.getElementById('supSearch').value.trim().toLowerCase();
    const suppliers = Store.get('suppliers', []).filter(s => !q || s.name.toLowerCase().indexOf(q) !== -1);
    const tbody = document.getElementById('suppliersTbody');
    if (!suppliers.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">' + icon('suppliers') + '<h3>No suppliers found</h3></div></td></tr>';
      return;
    }
    tbody.innerHTML = suppliers.map(s => {
      const count = productsSuppliedBy(s.id).length;
      return '<tr>' +
        '<td style="font-weight:600;color:var(--ink);">' + Utils.escapeHtml(s.name) + '</td>' +
        '<td>' + Utils.escapeHtml(s.contactPerson) + '</td>' +
        '<td>' + Utils.escapeHtml(s.contactNumber) + '</td>' +
        '<td>' + Utils.escapeHtml(s.email) + '</td>' +
        '<td>' + count + ' product' + (count === 1 ? '' : 's') + '</td>' +
        '<td class="text-muted">' + (s.lastDelivery ? Utils.formatDate(s.lastDelivery) : '\u2014') + '</td>' +
        '<td><span class="badge ' + (s.status === 'Active' ? 'badge-ok' : 'badge-neutral') + '">' + s.status + '</span></td>' +
        '<td><div class="flex gap-8">' +
          '<button class="icon-btn" title="View" data-view="' + s.id + '">' + icon('eye') + '</button>' +
          '<button class="icon-btn" title="Edit" data-edit="' + s.id + '">' + icon('edit') + '</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function openSupplierModal(mode, supplierId) {
    editingSupplierId = mode === 'edit' ? supplierId : null;
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierModalTitle').textContent = mode === 'edit' ? 'Edit Supplier' : 'Add Supplier';
    if (mode === 'edit') {
      const s = Store.get('suppliers', []).find(x => x.id === supplierId);
      if (!s) return;
      document.getElementById('supName').value = s.name;
      document.getElementById('supContact').value = s.contactPerson;
      document.getElementById('supPhone').value = s.contactNumber;
      document.getElementById('supEmail').value = s.email;
      document.getElementById('supLastDelivery').value = s.lastDelivery || '';
      document.getElementById('supStatus').value = s.status;
    }
    openModal('supplierModalOverlay');
  }

  function saveSupplier() {
    const form = document.getElementById('supplierForm');
    if (!validateForm(form)) return;
    const suppliers = Store.get('suppliers', []);
    const payload = {
      name: document.getElementById('supName').value.trim(),
      contactPerson: document.getElementById('supContact').value.trim(),
      contactNumber: document.getElementById('supPhone').value.trim(),
      email: document.getElementById('supEmail').value.trim(),
      lastDelivery: document.getElementById('supLastDelivery').value,
      status: document.getElementById('supStatus').value
    };
    if (editingSupplierId) {
      const idx = suppliers.findIndex(s => s.id === editingSupplierId);
      if (idx > -1) suppliers[idx] = Object.assign({}, suppliers[idx], payload);
      showToast('Updated ' + payload.name + '.', 'ok');
    } else {
      const newId = Utils.nextId('SUP', suppliers.map(s => s.id), 3);
      suppliers.push(Object.assign({ id: newId }, payload));
      showToast('Added supplier ' + payload.name + '.', 'ok');
    }
    Store.set('suppliers', suppliers);
    closeModal('supplierModalOverlay');
    renderTable();
  }

  function openViewModal(supplierId) {
    const s = Store.get('suppliers', []).find(x => x.id === supplierId);
    if (!s) return;
    const products = productsSuppliedBy(s.id);
    const purchaseHistory = Store.get('inventoryTransactions', [])
      .filter(function (t) { return t.type === 'Stock In' && t.supplierId === s.id; })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    document.getElementById('supplierViewBody').innerHTML =
      '<h2 style="margin-bottom:2px;">' + Utils.escapeHtml(s.name) + '</h2>' +
      '<span class="badge ' + (s.status === 'Active' ? 'badge-ok' : 'badge-neutral') + '">' + s.status + '</span>' +
      '<div class="form-grid" style="margin-top:16px;">' +
        viewField('Contact Person', Utils.escapeHtml(s.contactPerson)) +
        viewField('Contact Number', Utils.escapeHtml(s.contactNumber)) +
        viewField('Email', Utils.escapeHtml(s.email)) +
        viewField('Last Delivery', s.lastDelivery ? Utils.formatDate(s.lastDelivery) : '\u2014') +
      '</div>' +
      '<h3 style="margin-top:22px;font-size:.92rem;">Products Supplied (' + products.length + ')</h3>' +
      (products.length
        ? '<ul style="margin-top:8px;">' + products.map(p => '<li style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.85rem;">' + Utils.escapeHtml(p.name) + ' <span class="text-muted">(' + p.id + ')</span></li>').join('') + '</ul>'
        : '<p class="text-muted" style="font-size:.85rem;">No products linked yet.</p>') +
      '<h3 style="margin-top:22px;font-size:.92rem;">Purchase History (' + purchaseHistory.length + ')</h3>' +
      (purchaseHistory.length
        ? '<ul style="margin-top:8px;">' + purchaseHistory.slice(0, 8).map(function (t) {
            return '<li style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:.85rem;">' +
              '<span>' + Utils.escapeHtml(t.productName) + (t.reference ? ' <span class="text-muted">(' + Utils.escapeHtml(t.reference) + ')</span>' : '') + '</span>' +
              '<span class="mono-num" style="white-space:nowrap;"><strong style="color:var(--ok);">+' + t.quantity + '</strong> &middot; ' + Utils.formatShortDate(t.date) + '</span></li>';
          }).join('') + '</ul>'
        : '<p class="text-muted" style="font-size:.85rem;">No stock-in recorded from this supplier yet.</p>');
    document.getElementById('supplierViewToEdit').dataset.supplierId = s.id;
    openModal('supplierViewOverlay');
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderTable();
    document.getElementById('supSearch').addEventListener('input', renderTable);
    document.getElementById('addSupplierBtn').addEventListener('click', function () { openSupplierModal('add'); });
    document.getElementById('saveSupplierBtn').addEventListener('click', saveSupplier);
    document.getElementById('suppliersTbody').addEventListener('click', function (e) {
      const viewBtn = e.target.closest('[data-view]');
      const editBtn = e.target.closest('[data-edit]');
      if (viewBtn) openViewModal(viewBtn.dataset.view);
      else if (editBtn) openSupplierModal('edit', editBtn.dataset.edit);
    });
    document.getElementById('supplierViewToEdit').addEventListener('click', function () {
      const id = document.getElementById('supplierViewToEdit').dataset.supplierId;
      closeModal('supplierViewOverlay');
      openSupplierModal('edit', id);
    });
    document.querySelectorAll('[data-close]').forEach(function (btn) { btn.addEventListener('click', function () { closeModal(btn.dataset.close); }); });
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(overlay.id); });
    });
  });
})();
