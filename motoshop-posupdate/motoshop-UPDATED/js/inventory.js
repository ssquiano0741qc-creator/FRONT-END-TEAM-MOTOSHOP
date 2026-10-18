/* ==========================================================================
   inventory.js — powers inventory.html
   ========================================================================== */
(function () {
  if (!initShell('inventory')) return;

  let editingProductId = null;
  let compatSelections = [];
  let stockModalType = 'in';
  let showArchived = false;

  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  function showConfirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const btn = document.getElementById('confirmActionBtn');
    const freshBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(freshBtn, btn);
    freshBtn.addEventListener('click', function () {
      closeModal('confirmOverlay');
      onConfirm();
    });
    openModal('confirmOverlay');
  }

  /* ---------- Header stats + recent activity ---------- */
  function renderStatHeader() {
    const products = Store.get('products', []).filter(p => !p.archived);
    const transactions = Store.get('inventoryTransactions', []);
    const available = products.filter(p => Utils.getStockStatus(p.stock, p.reorderLevel) === 'In Stock').length;
    const low = Analytics.lowStockProducts(products).length;
    const out = Analytics.outOfStockProducts(products).length;
    const totalQty = products.reduce((s, p) => s + p.stock, 0);

    const stats = [
      { label: 'Total Products', value: products.length, iconName: 'box', tone: 'accent' },
      { label: 'Available', value: available, iconName: 'checkCircle', tone: 'ok' },
      { label: 'Low Stock', value: low, iconName: 'alertTriangle', tone: 'warn' },
      { label: 'Out of Stock', value: out, iconName: 'xCircle', tone: 'danger' },
      { label: 'Total Stock Quantity', value: totalQty.toLocaleString(), iconName: 'archive', tone: 'accent' }
    ];
    document.getElementById('invStatGrid').innerHTML = stats.map(s =>
      '<div class="stat-card tone-' + s.tone + '">' +
        '<div class="stat-icon tone-' + s.tone + '">' + icon(s.iconName) + '</div>' +
        '<div class="stat-label">' + s.label + '</div>' +
        '<div class="stat-value">' + s.value + '</div>' +
      '</div>'
    ).join('');

    const recent = Analytics.recentTransactions(transactions, 5);
    document.getElementById('recentActivityList').innerHTML = recent.length
      ? recent.map(t => {
          const typeTone = t.type === 'Stock In' ? 'badge-ok' : t.type === 'Sale' ? 'badge-neutral' : 'badge-danger';
          const qtyDisplay = (t.quantity > 0 ? '+' : '') + t.quantity;
          return '<div class="flex items-center justify-between" style="padding:9px 0;border-bottom:1px solid var(--border);">' +
            '<div class="flex items-center gap-12"><span class="badge ' + typeTone + '">' + t.type + '</span>' +
            '<span style="font-weight:600;font-size:.85rem;color:var(--ink);">' + Utils.escapeHtml(t.productName) + '</span></div>' +
            '<div class="flex items-center gap-12"><span class="mono-num" style="font-weight:700;color:' + (t.quantity < 0 ? 'var(--danger)' : 'var(--ok)') + ';">' + qtyDisplay + '</span>' +
            '<span class="text-muted" style="font-size:.78rem;">' + Utils.timeAgo(t.date) + '</span></div>' +
          '</div>';
        }).join('')
      : '<div class="empty-state">' + icon('history') + '<h3>No activity yet</h3></div>';
  }

  /* ---------- Static dropdown population ---------- */
  function populateStaticSelects() {
    const categories = Store.get('categories', []);
    const suppliers = Store.get('suppliers', []);
    const products = Store.get('products', []);

    const catOptions = categories.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
    document.getElementById('filterCategory').innerHTML = '<option value="">All Categories</option>' + catOptions;
    document.getElementById('pCategory').innerHTML = catOptions;

    const supOptions = suppliers.map(s => '<option value="' + s.id + '">' + Utils.escapeHtml(s.name) + '</option>').join('');
    document.getElementById('pSupplier').innerHTML = supOptions;
    document.getElementById('sSupplier').innerHTML = supOptions;
    document.getElementById('filterSupplier').innerHTML = '<option value="">All Suppliers</option>' + supOptions;

    const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort();
    document.getElementById('filterProductBrand').innerHTML = '<option value="">All Brands</option>' + brands.map(b => '<option value="' + Utils.escapeHtml(b) + '">' + Utils.escapeHtml(b) + '</option>').join('');

    const brandOptions = Object.keys(MOTO_BRANDS).map(b => '<option value="' + b + '">' + b + '</option>').join('');
    document.getElementById('filterBrand').innerHTML = '<option value="">Any Brand</option>' + brandOptions;

    const prodOptions = products.filter(p => !p.archived).map(p => '<option value="' + p.id + '">' + Utils.escapeHtml(p.name) + ' (' + p.id + ')</option>').join('');
    document.getElementById('sProduct').innerHTML = prodOptions;
  }

  function populateCompatBrandSelect() {
    const brandSel = document.getElementById('pCompatBrand');
    brandSel.innerHTML = Object.keys(MOTO_BRANDS).map(b => '<option value="' + b + '">' + b + '</option>').join('');
    updateCompatModelOptions();
  }
  function updateCompatModelOptions() {
    const brand = document.getElementById('pCompatBrand').value;
    document.getElementById('pCompatModel').innerHTML = (MOTO_BRANDS[brand] || []).map(m => '<option value="' + m + '">' + m + '</option>').join('');
  }

  /* ---------- Products table ---------- */
  function compatSummary(compat) {
    if (compat.includes(UNIVERSAL_FIT)) return 'Universal';
    if (compat.length <= 2) return compat.join(', ');
    return compat[0] + ' +' + (compat.length - 1) + ' more';
  }
  function matchesBrandModel(product, brand, model) {
    if (!brand) return true;
    if (product.compatibility.includes(UNIVERSAL_FIT)) return true;
    if (model) return product.compatibility.includes(brand + ' ' + model);
    return product.compatibility.some(c => c.indexOf(brand + ' ') === 0);
  }
  function getFilteredProducts() {
    const products = Store.get('products', []);
    const q = document.getElementById('invSearch').value.trim().toLowerCase();
    const cat = document.getElementById('filterCategory').value;
    const status = document.getElementById('filterStatus').value;
    const brand = document.getElementById('filterBrand').value;
    const model = document.getElementById('filterModel').value;
    const prodBrand = document.getElementById('filterProductBrand').value;
    const supplier = document.getElementById('filterSupplier').value;
    const sortBy = document.getElementById('sortBy').value;

    let rows = products.filter(p => {
      if (!!p.archived !== showArchived) return false;
      if (q && p.name.toLowerCase().indexOf(q) === -1 && p.id.toLowerCase().indexOf(q) === -1 && (p.brand || '').toLowerCase().indexOf(q) === -1) return false;
      if (cat && p.category !== cat) return false;
      if (status && Utils.getStockStatus(p.stock, p.reorderLevel) !== status) return false;
      if (prodBrand && p.brand !== prodBrand) return false;
      if (supplier && p.supplier !== supplier) return false;
      if (!matchesBrandModel(p, brand, model)) return false;
      return true;
    });

    const sorters = {
      'name-asc': (a, b) => a.name.localeCompare(b.name),
      'name-desc': (a, b) => b.name.localeCompare(a.name),
      'price-asc': (a, b) => a.sellingPrice - b.sellingPrice,
      'price-desc': (a, b) => b.sellingPrice - a.sellingPrice,
      'stock-asc': (a, b) => a.stock - b.stock,
      'stock-desc': (a, b) => b.stock - a.stock,
      'updated-desc': (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)
    };
    rows.sort(sorters[sortBy] || sorters['name-asc']);
    return rows;
  }
  function renderProductsTable() {
    const categories = Store.get('categories', []);
    const suppliers = Store.get('suppliers', []);
    const rows = getFilteredProducts();
    const tbody = document.getElementById('productsTbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state">' + icon('search') + '<h3>' + (showArchived ? 'No archived products' : 'No products match your filters') + '</h3><p>' + (showArchived ? 'Nothing has been archived yet.' : 'Try a different search or clear filters.') + '</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(p => {
      const cat = categories.find(c => c.id === p.category);
      const sup = suppliers.find(s => s.id === p.supplier);
      const status = Utils.getStockStatus(p.stock, p.reorderLevel);
      const flagClass = status === 'Out of Stock' ? 'danger' : status === 'Low Stock' ? 'warn' : 'ok';
      const archivedRow = p.archived ? ' style="opacity:.6;"' : '';
      return '<tr class="row-status-bar"' + archivedRow + '>' +
        '<td><span class="stock-flag ' + flagClass + '"></span><div class="cell-product"><div class="cell-thumb thumb-' + p.category + '">' +
          '<svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke-width:1.8;fill:none;">' + Utils.categoryIcon(p.category) + '</svg></div>' +
          '<div><div class="name">' + Utils.escapeHtml(p.name) + (p.archived ? ' <span class="badge badge-neutral">Archived</span>' : '') + '</div><div class="sub">' + p.id + '</div></div></div></td>' +
        '<td>' + Utils.escapeHtml(p.brand || '\u2014') + '</td>' +
        '<td>' + (cat ? cat.name : p.category) + '</td>' +
        '<td>' + compatSummary(p.compatibility) + '</td>' +
        '<td>' + (sup ? Utils.escapeHtml(sup.name) : '\u2014') + '</td>' +
        '<td class="text-right mono-num">' + Utils.formatPHP(p.sellingPrice) + '</td>' +
        '<td class="text-right mono-num">' + p.stock + '</td>' +
        '<td><span class="badge ' + Utils.statusClass(status) + '">' + status + '</span></td>' +
        '<td class="text-muted" style="font-size:.78rem;">' + Utils.timeAgo(p.lastUpdated) + '</td>' +
        '<td><div class="flex gap-8">' +
          '<button class="icon-btn" title="View" data-view="' + p.id + '">' + icon('eye') + '</button>' +
          '<button class="icon-btn" title="Edit" data-edit="' + p.id + '">' + icon('edit') + '</button>' +
          (p.archived
            ? '<button class="icon-btn" title="Unarchive" data-unarchive="' + p.id + '">' + icon('refresh') + '</button>'
            : '<button class="icon-btn" title="Stock In" data-stockin="' + p.id + '">' + icon('stockIn') + '</button>' +
              '<button class="icon-btn" title="Stock Out" data-stockout="' + p.id + '">' + icon('stockOut') + '</button>' +
              '<button class="icon-btn" title="Archive" data-archive="' + p.id + '">' + icon('archive') + '</button>') +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  /* ---------- History table ---------- */
  function renderHistoryTable() {
    const q = document.getElementById('histSearch').value.trim().toLowerCase();
    const type = document.getElementById('filterHistType').value;
    const transactions = Store.get('inventoryTransactions', []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const rows = transactions.filter(t => {
      if (q && t.productName.toLowerCase().indexOf(q) === -1) return false;
      if (type && t.type !== type) return false;
      return true;
    }).slice(0, 200);
    const tbody = document.getElementById('historyTbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">' + icon('history') + '<h3>No history yet</h3></div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(t => {
      const qtyDisplay = (t.quantity > 0 ? '+' : '') + t.quantity;
      const typeTone = t.type === 'Stock In' ? 'badge-ok' : t.type === 'Sale' ? 'badge-neutral' : 'badge-danger';
      const reasonRef = t.reference ? t.reference : (t.reason || t.notes || '\u2014');
      return '<tr>' +
        '<td class="text-muted">' + Utils.formatDateTime(t.date) + '</td>' +
        '<td style="font-weight:600;color:var(--ink);">' + Utils.escapeHtml(t.productName) + '</td>' +
        '<td><span class="badge ' + typeTone + '">' + t.type + '</span></td>' +
        '<td class="text-right mono-num" style="font-weight:700;color:' + (t.quantity < 0 ? 'var(--danger)' : 'var(--ok)') + ';">' + qtyDisplay + '</td>' +
        '<td class="text-right mono-num text-muted">' + t.previousStock + '</td>' +
        '<td class="text-right mono-num" style="font-weight:700;">' + t.newStock + '</td>' +
        '<td class="text-muted">' + Utils.escapeHtml(reasonRef) + '</td>' +
        '<td>' + Utils.escapeHtml(t.user) + '</td>' +
      '</tr>';
    }).join('');
  }

  /* ---------- Compatibility chip builder ---------- */
  function renderCompatChips() {
    const wrap = document.getElementById('compatChips');
    wrap.innerHTML = compatSelections.length
      ? compatSelections.map((c, i) => '<span class="chip active" data-remove-compat="' + i + '" style="cursor:pointer;">' + c + ' &times;</span>').join('')
      : '<span class="hint" style="margin:0;">No specific models added yet.</span>';
  }

  /* ---------- Image preview ---------- */
  function updateImagePreviewFallback() {
    if (document.getElementById('pImageFile').files.length) return;
    const cat = document.getElementById('pCategory').value;
    document.getElementById('imagePreview').innerHTML = '<svg viewBox="0 0 24 24" style="width:26px;height:26px;stroke:var(--steel);stroke-width:1.7;fill:none;">' + Utils.categoryIcon(cat) + '</svg>';
    document.getElementById('imageDropLabel').textContent = 'Click to choose an image';
  }

  /* ---------- Add / Edit product modal ---------- */
  function updateIdPreview() {
    const categories = Store.get('categories', []);
    const cat = categories.find(c => c.id === document.getElementById('pCategory').value);
    const products = Store.get('products', []);
    document.getElementById('idPreviewValue').textContent = cat ? Utils.nextId(cat.prefix, products.map(p => p.id), 3) : '\u2014';
  }

  /* Warranty (optional): the checkbox reveals the period + coverage fields. They stay disabled
     (and the period stays non-required) while the box is unticked, so validateForm ignores them. */
  function syncWarrantyFields() {
    const on = document.getElementById('pHasWarranty').checked;
    document.getElementById('warrantyFields').style.display = on ? '' : 'none';
    ['pWarrantyDuration', 'pWarrantyUnit', 'pWarrantyCoverage'].forEach(function (id) {
      document.getElementById(id).disabled = !on;
    });
    document.getElementById('pWarrantyDuration').required = on;
  }

  function warrantyLabel(p) {
    const n = p.warrantyDuration || p.warrantyDays;   // warrantyDays: older records only stored days
    if (!n) return 'No warranty';
    const unit = p.warrantyDuration ? (p.warrantyUnit || 'months') : 'days';
    return n + ' ' + (n === 1 ? unit.replace(/s$/, '') : unit) + (p.warrantyType ? ' \u2014 ' + p.warrantyType : '');
  }

  function openProductModal(mode, productId) {
    editingProductId = mode === 'edit' ? productId : null;
    const products = Store.get('products', []);
    const product = productId ? products.find(p => p.id === productId) : null;

    document.getElementById('productModalTitle').textContent = mode === 'edit' ? 'Edit Product' : 'Add Product';
    document.getElementById('productForm').reset();
    document.querySelectorAll('#productForm .field.has-error').forEach(f => { f.classList.remove('has-error'); const m = f.querySelector('.field-error-msg'); if (m) m.remove(); });
    compatSelections = [];
    document.getElementById('pImageFile').value = '';

    const stockInput = document.getElementById('pStock');
    const stockHint = document.getElementById('stockEditHint');

    if (mode === 'edit' && product) {
      document.getElementById('pName').value = product.name;
      document.getElementById('pBrand').value = product.brand || '';
      document.getElementById('pCategory').value = product.category;
      document.getElementById('pSupplier').value = product.supplier;
      document.getElementById('pSupplierRef').value = product.supplierRef || '';
      document.getElementById('pCompatYears').value = product.compatYears || '';
      stockInput.value = product.stock;
      stockInput.disabled = true;
      stockHint.style.display = 'block';
      document.getElementById('pCost').value = product.costPrice;
      document.getElementById('pPrice').value = product.sellingPrice;
      document.getElementById('pReorder').value = product.reorderLevel;
      document.getElementById('pDescription').value = product.description || '';
      const warrantyN = product.warrantyDuration || product.warrantyDays;
      if (warrantyN) {
        document.getElementById('pHasWarranty').checked = true;
        document.getElementById('pWarrantyDuration').value = warrantyN;
        document.getElementById('pWarrantyUnit').value = product.warrantyDuration ? (product.warrantyUnit || 'months') : 'days';
        document.getElementById('pWarrantyCoverage').value = product.warrantyType || '';
      }
      document.getElementById('idPreviewValue').textContent = product.id;
      if (product.compatibility.includes(UNIVERSAL_FIT)) {
        document.getElementById('pUniversal').checked = true;
      } else {
        compatSelections = product.compatibility.slice();
        document.getElementById('pUniversal').checked = false;
      }
    } else {
      stockInput.disabled = false;
      stockInput.value = 0;
      stockHint.style.display = 'none';
      document.getElementById('pUniversal').checked = false;
      document.getElementById('pCompatYears').value = 'All Years';
      updateIdPreview();
    }
    document.getElementById('pUniversal').dispatchEvent(new Event('change'));
    syncWarrantyFields();
    renderCompatChips();
    updateImagePreviewFallback();
    openModal('productModalOverlay');
  }

  function saveProduct() {
    const form = document.getElementById('productForm');
    if (!validateForm(form)) return;
    const isUniversal = document.getElementById('pUniversal').checked;
    const compatibility = isUniversal ? [UNIVERSAL_FIT] : compatSelections.slice();
    if (!compatibility.length) {
      showToast('Add at least one compatible model, or mark it Universal fit.', 'danger');
      return;
    }
    const categoryId = document.getElementById('pCategory').value;
    const now = Utils.demoNow().toISOString();
    const hasWarranty = document.getElementById('pHasWarranty').checked;
    const warrantyDuration = hasWarranty ? (parseInt(document.getElementById('pWarrantyDuration').value, 10) || null) : null;
    const warrantyUnit = hasWarranty ? document.getElementById('pWarrantyUnit').value : null;
    const payload = {
      name: document.getElementById('pName').value.trim(),
      brand: document.getElementById('pBrand').value.trim(),
      category: categoryId,
      supplier: document.getElementById('pSupplier').value,
      supplierRef: document.getElementById('pSupplierRef').value.trim(),
      description: document.getElementById('pDescription').value.trim(),
      costPrice: parseFloat(document.getElementById('pCost').value) || 0,
      sellingPrice: parseFloat(document.getElementById('pPrice').value) || 0,
      reorderLevel: parseInt(document.getElementById('pReorder').value, 10) || 0,
      warrantyDuration: warrantyDuration,
      warrantyUnit: warrantyDuration ? warrantyUnit : null,
      warrantyType: warrantyDuration ? (document.getElementById('pWarrantyCoverage').value.trim() || null) : null,
      /* warrantyDays is the older day-count field; keep it in step (months = 30 days, years = 365) */
      warrantyDays: warrantyDuration ? warrantyDuration * ({ days: 1, months: 30, years: 365 }[warrantyUnit] || 1) : null,
      compatibility: compatibility,
      compatYears: document.getElementById('pCompatYears').value.trim() || 'All Years',
      image: categoryId,
      lastUpdated: now
    };

    const products = Store.get('products', []);
    if (editingProductId) {
      const idx = products.findIndex(p => p.id === editingProductId);
      if (idx > -1) products[idx] = Object.assign({}, products[idx], payload);
      Store.set('products', products);
      showToast('Updated ' + payload.name + '.', 'ok');
    } else {
      const categories = Store.get('categories', []);
      const cat = categories.find(c => c.id === categoryId);
      const newId = Utils.nextId(cat.prefix, products.map(p => p.id), 3);
      const stock = parseInt(document.getElementById('pStock').value, 10) || 0;
      const newProduct = Object.assign({ id: newId, stock: stock, archived: false }, payload);
      products.push(newProduct);
      Store.set('products', products);

      if (stock > 0) {
        const transactions = Store.get('inventoryTransactions', []);
        transactions.unshift({
          id: Utils.nextId('TRX', transactions.map(t => t.id), 4),
          productId: newId, productName: newProduct.name, type: 'Stock In',
          quantity: stock, previousStock: 0, newStock: stock,
          date: now, user: getSession().name, supplierId: newProduct.supplier, reference: 'Initial stock', reason: null, notes: 'Initial stock on product creation'
        });
        Store.set('inventoryTransactions', transactions);
      }
      showToast('Added ' + newProduct.name + ' (' + newId + ').', 'ok');
    }

    closeModal('productModalOverlay');
    renderProductsTable();
    renderHistoryTable();
    renderStatHeader();
    populateStaticSelects();
    if (window.Notifications) Notifications.render();
    renderSidebar('inventory');
  }

  /* ---------- View modal ---------- */
  function viewField(label, value) {
    return '<div><div class="hint" style="margin:0 0 3px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">' + label + '</div><div style="font-weight:600;color:var(--ink);font-size:.9rem;">' + value + '</div></div>';
  }
  function openViewModal(productId) {
    const products = Store.get('products', []);
    const categories = Store.get('categories', []);
    const suppliers = Store.get('suppliers', []);
    const sales = Store.get('sales', []);
    const transactions = Store.get('inventoryTransactions', []);
    const p = products.find(x => x.id === productId);
    if (!p) return;
    const cat = categories.find(c => c.id === p.category);
    const sup = suppliers.find(s => s.id === p.supplier);
    const status = Utils.getStockStatus(p.stock, p.reorderLevel);
    const compat = p.compatibility.includes(UNIVERSAL_FIT) ? 'Universal (All Models)' : p.compatibility.join(', ');

    document.getElementById('viewModalHead').innerHTML =
      '<div class="flex gap-12">' +
        '<div class="cell-thumb thumb-' + p.category + '" style="width:60px;height:60px;flex-shrink:0;">' +
          '<svg viewBox="0 0 24 24" style="width:28px;height:28px;stroke-width:1.6;fill:none;">' + Utils.categoryIcon(p.category) + '</svg></div>' +
        '<div><h2 style="margin-bottom:2px;">' + Utils.escapeHtml(p.name) + '</h2>' +
        '<div class="text-muted" style="font-size:.85rem;">' + p.id + ' &middot; ' + Utils.escapeHtml(p.brand || '') + ' &middot; ' + (cat ? cat.name : '') + '</div>' +
        '<span class="badge ' + Utils.statusClass(status) + '" style="margin-top:6px;">' + status + '</span>' +
        (p.archived ? ' <span class="badge badge-neutral">Archived</span>' : '') + '</div>' +
      '</div>';

    document.getElementById('vtab-overview').innerHTML =
      '<p style="color:var(--steel);font-size:.88rem;">' + Utils.escapeHtml(p.description || 'No description yet.') + '</p>' +
      '<div class="form-grid" style="margin-top:6px;">' +
        viewField('Selling Price', Utils.formatPHP(p.sellingPrice)) +
        viewField('Cost Price', Utils.formatPHP(p.costPrice)) +
        viewField('Compatibility', compat) +
        viewField('Model Year', Utils.escapeHtml(p.compatYears || 'All Years')) +
        viewField('Warranty', Utils.escapeHtml(warrantyLabel(p))) +
        (p.category === 'motorcycles' ? viewField('Engine Type', Utils.escapeHtml(p.engineType || '\u2014')) : '') +
        (p.category === 'motorcycles' ? viewField('Displacement / Color', Utils.escapeHtml((p.displacement || '') + (p.color ? ' \u2014 ' + p.color : ''))) : '') +
      '</div>';

    document.getElementById('vtab-inventory').innerHTML =
      '<div class="form-grid">' +
        viewField('Current Stock', p.stock + ' units') +
        viewField('Reorder Level', p.reorderLevel + ' units') +
        viewField('Status', status) +
        viewField('Last Updated', Utils.formatDateTime(p.lastUpdated)) +
      '</div>';

    const salesForProduct = [];
    sales.forEach(function (s) {
      s.items.forEach(function (i) { if (i.productId === p.id) salesForProduct.push({ date: s.date, qty: i.qty, subtotal: i.subtotal }); });
    });
    const unitsSold = salesForProduct.reduce(function (s, r) { return s + r.qty; }, 0);
    const revenue = salesForProduct.reduce(function (s, r) { return s + r.subtotal; }, 0);
    document.getElementById('vtab-sales').innerHTML =
      '<div class="form-grid" style="margin-bottom:14px;">' +
        viewField('Total Units Sold', String(unitsSold)) +
        viewField('Total Revenue', Utils.formatPHP(revenue)) +
      '</div>' +
      (salesForProduct.length
        ? '<div class="table-wrap"><table><thead><tr><th>Date</th><th class="text-right">Qty</th><th class="text-right">Amount</th></tr></thead><tbody>' +
          salesForProduct.sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 8).map(function (r) {
            return '<tr><td class="text-muted">' + Utils.formatDate(r.date) + '</td><td class="text-right mono-num">' + r.qty + '</td><td class="text-right mono-num">' + Utils.formatPHP(r.subtotal) + '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="empty-state">' + icon('sales') + '<h3>No sales yet</h3></div>');

    document.getElementById('vtab-supplier').innerHTML = sup
      ? '<div class="form-grid">' +
          viewField('Supplier', Utils.escapeHtml(sup.name)) +
          viewField('Contact', Utils.escapeHtml(sup.contactPerson) + ' \u2014 ' + Utils.escapeHtml(sup.contactNumber)) +
          viewField('Supplier Reference', Utils.escapeHtml(p.supplierRef || '\u2014')) +
          viewField('Last Delivery', sup.lastDelivery ? Utils.formatDate(sup.lastDelivery) : '\u2014') +
        '</div>'
      : '<div class="empty-state">' + icon('suppliers') + '<h3>No supplier on file</h3></div>';

    const activity = transactions.filter(function (t) { return t.productId === p.id; }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 8);
    document.getElementById('vtab-activity').innerHTML = activity.length
      ? '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th class="text-right">Qty</th><th>Staff</th></tr></thead><tbody>' +
        activity.map(function (t) {
          const typeTone = t.type === 'Stock In' ? 'badge-ok' : t.type === 'Sale' ? 'badge-neutral' : 'badge-danger';
          return '<tr><td class="text-muted">' + Utils.formatDateTime(t.date) + '</td><td><span class="badge ' + typeTone + '">' + t.type + '</span></td>' +
            '<td class="text-right mono-num" style="font-weight:700;color:' + (t.quantity < 0 ? 'var(--danger)' : 'var(--ok)') + ';">' + (t.quantity > 0 ? '+' : '') + t.quantity + '</td><td>' + Utils.escapeHtml(t.user) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : '<div class="empty-state">' + icon('history') + '<h3>No activity yet</h3></div>';

    document.querySelectorAll('#viewTabs .tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelector('#viewTabs .tab-btn[data-tab="overview"]').classList.add('active');
    document.querySelectorAll('#viewModalOverlay .tab-panel').forEach(function (tp) { tp.classList.remove('active'); });
    document.getElementById('vtab-overview').classList.add('active');

    document.getElementById('viewToEditBtn').dataset.productId = p.id;
    openModal('viewModalOverlay');
  }

  /* ---------- Stock In / Out modal ---------- */
  function updateStockHint() {
    const products = Store.get('products', []);
    const p = products.find(x => x.id === document.getElementById('sProduct').value);
    document.getElementById('currentStockHint').textContent = p ? ('Current stock: ' + p.stock + ' units') : '';
  }
  function openStockModal(type, productId) {
    stockModalType = type;
    document.getElementById('stockForm').reset();
    document.querySelectorAll('#stockForm .field.has-error').forEach(f => { f.classList.remove('has-error'); const m = f.querySelector('.field-error-msg'); if (m) m.remove(); });
    document.getElementById('stockModalTitle').textContent = type === 'in' ? 'Stock In' : 'Stock Out';
    document.getElementById('sSupplierField').style.display = type === 'in' ? 'block' : 'none';
    document.getElementById('sReferenceField').style.display = type === 'in' ? 'block' : 'none';
    document.getElementById('sReasonField').style.display = type === 'out' ? 'block' : 'none';
    const saveBtn = document.getElementById('saveStockBtn');
    saveBtn.className = 'btn ' + (type === 'in' ? 'btn-primary' : 'btn-danger');
    saveBtn.textContent = type === 'in' ? 'Confirm Stock In' : 'Confirm Stock Out';
    if (productId) document.getElementById('sProduct').value = productId;
    updateStockHint();
    document.getElementById('sDate').value = Utils.demoNow().toISOString().slice(0, 10);
    openModal('stockModalOverlay');
  }
  function saveStock() {
    const form = document.getElementById('stockForm');
    if (!validateForm(form)) return;
    const productId = document.getElementById('sProduct').value;
    const qty = parseInt(document.getElementById('sQty').value, 10);
    const dateStr = document.getElementById('sDate').value;
    const notes = document.getElementById('sNotes').value.trim();
    const reference = document.getElementById('sReference').value.trim();
    const products = Store.get('products', []);
    const product = products.find(p => p.id === productId);
    if (!product || !qty || qty < 1) return;

    if (stockModalType === 'out' && qty > product.stock) {
      showToast('Cannot stock out ' + qty + ' \u2014 only ' + product.stock + ' currently in stock.', 'danger');
      return;
    }

    const previousStock = product.stock;
    const newStock = stockModalType === 'in' ? previousStock + qty : previousStock - qty;
    product.stock = newStock;
    product.lastUpdated = Utils.demoNow().toISOString();
    Store.set('products', products);

    const now = Utils.demoNow();
    const chosenDate = new Date(dateStr + 'T' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ':00');
    const supplierId = document.getElementById('sSupplier').value;
    const reason = document.getElementById('sReason').value;

    const transactions = Store.get('inventoryTransactions', []);
    transactions.unshift({
      id: Utils.nextId('TRX', transactions.map(t => t.id), 4),
      productId: product.id, productName: product.name,
      type: stockModalType === 'in' ? 'Stock In' : 'Stock Out',
      quantity: stockModalType === 'in' ? qty : -qty,
      previousStock: previousStock, newStock: newStock,
      date: chosenDate.toISOString(), user: getSession().name,
      supplierId: stockModalType === 'in' ? supplierId : null,
      reference: stockModalType === 'in' ? (reference || null) : null,
      reason: stockModalType === 'out' ? reason : null,
      notes: notes
    });
    Store.set('inventoryTransactions', transactions);

    closeModal('stockModalOverlay');
    renderProductsTable();
    renderHistoryTable();
    renderStatHeader();
    if (window.Notifications) Notifications.render();
    renderSidebar('inventory');
    showToast((stockModalType === 'in' ? 'Stocked in ' : 'Stocked out ') + qty + ' units of ' + product.name + '. (' + previousStock + ' \u2192 ' + newStock + ')', 'ok');
  }

  /* ---------- Archive / Unarchive ---------- */
  function archiveProduct(productId) {
    const products = Store.get('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) return;
    showConfirm('Archive ' + product.name + '?', 'Archived products are hidden from POS, the storefront, and default reports, but their history is kept. You can unarchive anytime.', function () {
      product.archived = true;
      product.lastUpdated = Utils.demoNow().toISOString();
      Store.set('products', products);
      renderProductsTable();
      renderStatHeader();
      populateStaticSelects();
      if (window.Notifications) Notifications.render();
      renderSidebar('inventory');
      showToast(product.name + ' archived.', 'ok');
    });
  }
  function unarchiveProduct(productId) {
    const products = Store.get('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) return;
    product.archived = false;
    product.lastUpdated = Utils.demoNow().toISOString();
    Store.set('products', products);
    renderProductsTable();
    renderStatHeader();
    populateStaticSelects();
    renderSidebar('inventory');
    showToast(product.name + ' unarchived.', 'ok');
  }

  /* ---------- Category management ---------- */
  function renderCategoryList() {
    const categories = Store.get('categories', []);
    const products = Store.get('products', []);
    document.getElementById('categoryList').innerHTML = categories.map(c => {
      const count = products.filter(p => p.category === c.id && !p.archived).length;
      const inUse = products.some(p => p.category === c.id);
      return '<div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<div><div style="font-weight:600;color:var(--ink);font-size:.88rem;">' + Utils.escapeHtml(c.name) + '</div>' +
        '<div class="hint" style="margin:2px 0 0;">Prefix: ' + c.prefix + '</div></div>' +
        '<div class="flex items-center gap-8"><span class="badge badge-neutral">' + count + ' product' + (count === 1 ? '' : 's') + '</span>' +
        '<button type="button" class="icon-btn" data-delete-category="' + c.id + '" aria-label="Delete category ' + Utils.escapeHtml(c.name) + '"' +
          (inUse ? ' title="In use \u2014 move its products to another category first" style="opacity:.45;"' : ' title="Delete category"') + '>' +
          '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button></div>' +
      '</div>';
    }).join('');
  }

  /* Delete a category. Only allowed while no product (archived ones included) still uses it, so a product is
     never left pointing at a category that no longer exists. */
  function deleteCategory(categoryId) {
    const cat = Store.get('categories', []).find(c => c.id === categoryId);
    if (!cat) return;
    const used = Store.get('products', []).filter(p => p.category === categoryId).length;
    if (used) {
      showToast('"' + cat.name + '" still has ' + used + ' product' + (used === 1 ? '' : 's') + ' (archived ones count too). Move them to another category first (Edit product \u2192 Category).', 'danger');
      return;
    }
    showConfirm('Delete the "' + cat.name + '" category?', 'It has no products. This removes it from Inventory and POS. You can add it again later.', function () {
      Store.set('categories', Store.get('categories', []).filter(c => c.id !== categoryId));
      renderCategoryList();
      populateStaticSelects();
      renderProductsTable();
      showToast('Deleted category "' + cat.name + '".', 'ok');
    });
  }
  function derivePrefix(name, existingPrefixes) {
    const base = (name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3)) || 'GEN';
    let candidate = base, n = 1;
    while (existingPrefixes.indexOf(candidate) !== -1) { n++; candidate = base.slice(0, 2) + n; }
    return candidate;
  }

  /* ---------- Wiring ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    populateStaticSelects();
    populateCompatBrandSelect();
    renderStatHeader();
    renderProductsTable();
    renderHistoryTable();

    document.getElementById('pCompatBrand').addEventListener('change', updateCompatModelOptions);
    document.getElementById('pCategory').addEventListener('change', function () {
      if (!editingProductId) updateIdPreview();
      updateImagePreviewFallback();
    });
    document.getElementById('addCompatBtn').addEventListener('click', function () {
      const brand = document.getElementById('pCompatBrand').value;
      const model = document.getElementById('pCompatModel').value;
      const combo = brand + ' ' + model;
      if (compatSelections.indexOf(combo) === -1) compatSelections.push(combo);
      renderCompatChips();
    });
    document.getElementById('compatChips').addEventListener('click', function (e) {
      const target = e.target.closest('[data-remove-compat]');
      if (target) { compatSelections.splice(parseInt(target.dataset.removeCompat, 10), 1); renderCompatChips(); }
    });
    document.getElementById('pHasWarranty').addEventListener('change', syncWarrantyFields);

    document.getElementById('pUniversal').addEventListener('change', function (e) {
      const disabled = e.target.checked;
      document.getElementById('pCompatBrand').disabled = disabled;
      document.getElementById('pCompatModel').disabled = disabled;
      document.getElementById('addCompatBtn').disabled = disabled;
      document.getElementById('compatChips').style.opacity = disabled ? '.4' : '1';
    });

    document.getElementById('imageDropZone').addEventListener('click', function () { document.getElementById('pImageFile').click(); });
    document.getElementById('pImageFile').addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        document.getElementById('imagePreview').innerHTML = '<img src="' + ev.target.result + '" alt="">';
        document.getElementById('imageDropLabel').textContent = file.name;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('addProductBtn').addEventListener('click', function () { openProductModal('add'); });
    document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
    document.getElementById('saveStockBtn').addEventListener('click', saveStock);
    document.getElementById('viewToEditBtn').addEventListener('click', function () {
      const id = document.getElementById('viewToEditBtn').dataset.productId;
      closeModal('viewModalOverlay');
      openProductModal('edit', id);
    });
    document.getElementById('sProduct').addEventListener('change', updateStockHint);

    document.getElementById('manageCategoriesBtn').addEventListener('click', function () { renderCategoryList(); openModal('categoryModalOverlay'); });
    document.getElementById('newCategoryName').addEventListener('input', function (e) {
      const categories = Store.get('categories', []);
      document.getElementById('newCategoryPrefix').textContent = e.target.value.trim() ? derivePrefix(e.target.value, categories.map(c => c.prefix)) : '\u2014';
    });
    document.getElementById('addCategoryBtn').addEventListener('click', function () {
      const nameInput = document.getElementById('newCategoryName');
      const name = nameInput.value.trim();
      if (!name) { showToast('Enter a category name first.', 'danger'); return; }
      const categories = Store.get('categories', []);
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (categories.find(c => c.id === id)) { showToast('That category already exists.', 'danger'); return; }
      categories.push({ id: id, name: name, prefix: derivePrefix(name, categories.map(c => c.prefix)) });
      Store.set('categories', categories);
      nameInput.value = '';
      document.getElementById('newCategoryPrefix').textContent = '\u2014';
      renderCategoryList();
      populateStaticSelects();
      showToast('Added category "' + name + '".', 'ok');
    });
    document.getElementById('categoryList').addEventListener('click', function (e) {
      const delBtn = e.target.closest('[data-delete-category]');
      if (delBtn) deleteCategory(delBtn.dataset.deleteCategory);
    });

    document.getElementById('productsTbody').addEventListener('click', function (e) {
      const viewBtn = e.target.closest('[data-view]');
      const editBtn = e.target.closest('[data-edit]');
      const inBtn = e.target.closest('[data-stockin]');
      const outBtn = e.target.closest('[data-stockout]');
      const archiveBtn = e.target.closest('[data-archive]');
      const unarchiveBtn = e.target.closest('[data-unarchive]');
      if (viewBtn) openViewModal(viewBtn.dataset.view);
      else if (editBtn) openProductModal('edit', editBtn.dataset.edit);
      else if (inBtn) openStockModal('in', inBtn.dataset.stockin);
      else if (outBtn) openStockModal('out', outBtn.dataset.stockout);
      else if (archiveBtn) archiveProduct(archiveBtn.dataset.archive);
      else if (unarchiveBtn) unarchiveProduct(unarchiveBtn.dataset.unarchive);
    });

    document.getElementById('toggleArchivedChip').addEventListener('click', function () {
      showArchived = !showArchived;
      this.classList.toggle('active', showArchived);
      this.textContent = showArchived ? 'Showing Archived' : 'Show Archived';
      renderProductsTable();
    });

    document.getElementById('viewFullHistoryBtn').addEventListener('click', function () {
      document.querySelector('.page-header .tab-btn[data-tab="history"]').click();
      document.querySelector('.page-header').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.querySelectorAll('[data-close]').forEach(function (btn) { btn.addEventListener('click', function () { closeModal(btn.dataset.close); }); });
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(overlay.id); });
    });

    ['invSearch'].forEach(function (id) { document.getElementById(id).addEventListener('input', renderProductsTable); });
    ['filterCategory', 'filterStatus', 'filterModel', 'filterProductBrand', 'filterSupplier', 'sortBy'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', renderProductsTable);
    });
    document.getElementById('filterBrand').addEventListener('change', function () {
      const brand = document.getElementById('filterBrand').value;
      document.getElementById('filterModel').innerHTML = '<option value="">Any Model</option>' + (MOTO_BRANDS[brand] || []).map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
      renderProductsTable();
    });
    document.getElementById('histSearch').addEventListener('input', renderHistoryTable);
    document.getElementById('filterHistType').addEventListener('change', renderHistoryTable);

    document.querySelectorAll('.page-header .tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.page-header .tab-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('#tab-products, #tab-history').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      });
    });
    document.querySelectorAll('#viewTabs .tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#viewTabs .tab-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('#viewModalOverlay .tab-panel').forEach(function (tp) { tp.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('vtab-' + btn.dataset.tab).classList.add('active');
      });
    });
  });
})();
