/* ==========================================================================
   pos.js — powers pos.html
   ========================================================================== */
(function () {
  if (!initShell('pos')) return;

  const PAYMENT_ICONS = {
    'Cash': '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
    'GCash': '<rect x="7" y="2" width="10" height="20" rx="2"/><line x1="10" y1="18" x2="14" y2="18"/>',
    'Bank Transfer': '<polygon points="12,3 22,9 2,9"/><line x1="4" y1="9" x2="4" y2="19"/><line x1="9" y1="9" x2="9" y2="19"/><line x1="15" y1="9" x2="15" y2="19"/><line x1="20" y1="9" x2="20" y2="19"/><line x1="2" y1="21" x2="22" y2="21"/>'
  };

  let cart = [];
  let selectedPayment = 'Cash';
  let activeCategory = '';

  /* ---------- Meta bar: staff / live clock / transaction number ---------- */
  function renderMetaBar() {
    const session = getSession();
    document.getElementById('posMetaStaff').textContent = session.name;
    const sales = Store.get('sales', []);
    const nextId = Utils.nextId('SALE', sales.map(s => s.id), 4);
    document.getElementById('posMetaTxnNumber').textContent = 'TXN-' + nextId.split('-')[1];
  }
  function tickClock() {
    const el = document.getElementById('posMetaDateTime');
    if (el) el.textContent = Utils.demoNow().toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }

  function renderCategoryChips() {
    const categories = Store.get('categories', []);
    const chips = [{ id: '', name: 'All' }].concat(categories);
    document.getElementById('posCategoryChips').innerHTML = chips.map(c =>
      '<span class="chip' + (activeCategory === c.id ? ' active' : '') + '" data-cat="' + c.id + '">' + c.name + '</span>'
    ).join('');
  }

  function renderProductGrid() {
    const products = Store.get('products', []);
    const q = document.getElementById('posSearch').value.trim().toLowerCase();
    const rows = products.filter(p => {
      if (p.archived) return false;
      if (activeCategory && p.category !== activeCategory) return false;
      if (q && p.name.toLowerCase().indexOf(q) === -1 && p.id.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    const grid = document.getElementById('posProductGrid');
    if (!rows.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">' + icon('search') + '<h3>No products found</h3></div>';
      return;
    }
    grid.innerHTML = rows.map(p => {
      const inCart = cart.find(c => c.productId === p.id);
      const remaining = p.stock - (inCart ? inCart.qty : 0);
      const disabled = remaining <= 0;
      return '<button type="button" class="product-tile' + (disabled ? ' is-disabled' : '') + '" data-add="' + p.id + '"' + (disabled ? ' disabled' : '') + '>' +
        '<div class="tile-thumb thumb-' + p.category + '"><svg viewBox="0 0 24 24" style="stroke-width:1.6;fill:none;">' + Utils.categoryIcon(p.category) + '</svg></div>' +
        '<div class="tile-name">' + Utils.escapeHtml(p.name) + '</div>' +
        '<div class="tile-price">' + Utils.formatPHP(p.sellingPrice) + '</div>' +
        '<div class="tile-stock">' + (disabled ? 'Out of stock' : remaining + ' available') + '</div>' +
      '</button>';
    }).join('');
  }

  function currentTotals() {
    const subtotal = cart.reduce((s, c) => s + c.qty * c.price, 0);
    const discountRaw = parseFloat(document.getElementById('payDiscount').value) || 0;
    const discount = Math.max(0, Math.min(discountRaw, subtotal));
    const total = subtotal - discount;
    return { subtotal, discount, total };
  }

  function updateTotals() {
    const t = currentTotals();
    document.getElementById('paySubtotal').textContent = Utils.formatPHP(t.subtotal);
    document.getElementById('payTotal').textContent = Utils.formatPHP(t.total);
    updateChange();
  }

  function updateChange() {
    const t = currentTotals();
    const received = parseFloat(document.getElementById('payAmountReceived').value) || 0;
    const change = Math.max(0, received - t.total);
    document.getElementById('payChange').textContent = Utils.formatPHP(change);
  }

  function renderCart() {
    const list = document.getElementById('cartList');
    const itemCount = cart.reduce((s, c) => s + c.qty, 0);
    document.getElementById('cartItemCount').textContent = itemCount ? itemCount + ' item' + (itemCount === 1 ? '' : 's') + ' in cart' : 'Cart is empty';
    if (!cart.length) {
      list.innerHTML = '<div class="empty-state">' + icon('cart') + '<h3>No items yet</h3><p>Tap a product to add it to the sale.</p></div>';
    } else {
      list.innerHTML = cart.map(function (c, i) {
        return '<div class="cart-line">' +
          '<div class="cl-thumb thumb-' + c.category + '"><svg viewBox="0 0 24 24" style="stroke-width:1.8;fill:none;">' + Utils.categoryIcon(c.category) + '</svg></div>' +
          '<div class="cl-info"><div class="cl-name">' + Utils.escapeHtml(c.name) + '</div><div class="cl-price">' + Utils.formatPHP(c.price) + ' each</div></div>' +
          '<div class="qty-stepper">' +
            '<button type="button" data-dec="' + i + '">' + icon('minus') + '</button>' +
            '<span>' + c.qty + '</span>' +
            '<button type="button" data-inc="' + i + '">' + icon('plus') + '</button>' +
          '</div>' +
          '<button type="button" class="cl-remove" data-remove="' + i + '">' + icon('close') + '</button>' +
        '</div>';
      }).join('');
    }
    updateTotals();
  }

  function addToCart(productId) {
    const products = Store.get('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(c => c.productId === productId);
    const currentQty = existing ? existing.qty : 0;
    if (currentQty >= product.stock) {
      showToast('No more ' + product.name + ' in stock.', 'danger');
      return;
    }
    if (existing) existing.qty++;
    else cart.push({ productId: product.id, name: product.name, price: product.sellingPrice, qty: 1, category: product.category });
    renderCart();
    renderProductGrid();
  }
  function changeQty(index, delta) {
    const line = cart[index];
    if (!line) return;
    const products = Store.get('products', []);
    const product = products.find(p => p.id === line.productId);
    const newQty = line.qty + delta;
    if (newQty <= 0) {
      cart.splice(index, 1);
    } else if (product && newQty > product.stock) {
      showToast('Only ' + product.stock + ' ' + product.name + ' in stock.', 'danger');
      return;
    } else {
      line.qty = newQty;
    }
    renderCart();
    renderProductGrid();
  }
  function removeLine(index) {
    cart.splice(index, 1);
    renderCart();
    renderProductGrid();
  }
  function clearCart() {
    if (!cart.length) return;
    cart = [];
    document.getElementById('payDiscount').value = 0;
    document.getElementById('payAmountReceived').value = '';
    renderCart();
    renderProductGrid();
  }

  function renderPaymentMethods() {
    const methods = ['Cash', 'GCash', 'Bank Transfer'];
    document.getElementById('paymentMethodGrid').innerHTML = methods.map(m =>
      '<button type="button" class="payment-method-btn' + (selectedPayment === m ? ' selected' : '') + '" data-pay="' + m + '"><svg viewBox="0 0 24 24">' + PAYMENT_ICONS[m] + '</svg>' + m + '</button>'
    ).join('');
    document.getElementById('cashFields').style.display = selectedPayment === 'Cash' ? 'block' : 'none';
    document.getElementById('gcashFields').style.display = selectedPayment === 'GCash' ? 'block' : 'none';
  }

  function completeSale() {
    if (!cart.length) { showToast('Add at least one item first.', 'danger'); return; }
    const products = Store.get('products', []);
    for (let i = 0; i < cart.length; i++) {
      const product = products.find(p => p.id === cart[i].productId);
      if (!product || cart[i].qty > product.stock) {
        showToast('Stock changed for ' + cart[i].name + ' \u2014 please review the cart.', 'danger');
        renderCart(); renderProductGrid();
        return;
      }
    }
    const t = currentTotals();
    let amountReceived = t.total;
    if (selectedPayment === 'Cash') {
      amountReceived = parseFloat(document.getElementById('payAmountReceived').value) || 0;
      if (amountReceived < t.total) {
        showToast('Amount received is less than the total due.', 'danger');
        return;
      }
    }

    const session = getSession();
    const now = Utils.demoNow();
    const sales = Store.get('sales', []);
    const items = cart.map(c => ({ productId: c.productId, name: c.name, qty: c.qty, price: c.price, subtotal: c.qty * c.price }));
    const newSale = {
      id: Utils.nextId('SALE', sales.map(s => s.id), 4),
      date: now.toISOString(), items: items, total: t.total, subtotal: t.subtotal, discount: t.discount,
      paymentMethod: selectedPayment, staff: session.name
    };
    sales.unshift(newSale);
    Store.set('sales', sales);

    const transactions = Store.get('inventoryTransactions', []);
    const stockChanges = [];
    cart.forEach(function (line) {
      const product = products.find(p => p.id === line.productId);
      const previousStock = product.stock;
      product.stock = previousStock - line.qty;
      product.lastUpdated = now.toISOString();
      stockChanges.push({ name: product.name, previousStock: previousStock, newStock: product.stock });
      transactions.unshift({
        id: Utils.nextId('TRX', transactions.map(t2 => t2.id), 4),
        productId: product.id, productName: product.name, type: 'Sale',
        quantity: -line.qty, previousStock: previousStock, newStock: product.stock,
        date: now.toISOString(), user: session.name, supplierId: null, reference: newSale.id, reason: 'Sold', notes: 'Sold via POS (' + newSale.id + ')'
      });
    });
    Store.set('products', products);
    Store.set('inventoryTransactions', transactions);

    const txnDisplay = 'TXN-' + newSale.id.split('-')[1];
    document.getElementById('saleTxnNumber').textContent = 'Transaction #' + txnDisplay;
    let detail = items.length + ' item' + (items.length === 1 ? '' : 's') + ' \u2014 ' + Utils.formatPHP(t.total) + ' paid via ' + selectedPayment + '.';
    if (selectedPayment === 'Cash') {
      detail += ' Change: ' + Utils.formatPHP(Math.max(0, amountReceived - t.total)) + '.';
    }
    document.getElementById('saleSuccessDetail').textContent = detail;
    document.getElementById('saleInventoryUpdates').innerHTML = stockChanges.map(function (sc) {
      return '<div class="flex justify-between" style="padding:6px 0;border-bottom:1px solid var(--border);font-size:.85rem;">' +
        '<span style="font-weight:600;color:var(--ink);">' + Utils.escapeHtml(sc.name) + '</span>' +
        '<span class="mono-num">' + sc.previousStock + ' &rarr; <strong>' + sc.newStock + '</strong></span></div>';
    }).join('');
    document.getElementById('saleSuccessOverlay').classList.add('open');

    cart = [];
    document.getElementById('payDiscount').value = 0;
    document.getElementById('payAmountReceived').value = '';
    renderCart();
    renderProductGrid();
    renderMetaBar();
    if (window.Notifications) Notifications.render();
    renderSidebar('pos');
  }

  function switchPosTab(tab) {
    document.querySelectorAll('#posMobileTabs button').forEach(b => b.classList.toggle('active', b.dataset.postab === tab));
    document.querySelectorAll('.pos-col').forEach(c => c.classList.toggle('pos-active', c.dataset.poscol === tab));
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderMetaBar();
    tickClock();
    setInterval(tickClock, 1000);
    renderCategoryChips();
    renderProductGrid();
    renderCart();
    renderPaymentMethods();

    document.getElementById('posSearch').addEventListener('input', renderProductGrid);
    document.getElementById('posCategoryChips').addEventListener('click', function (e) {
      const chip = e.target.closest('[data-cat]');
      if (!chip) return;
      activeCategory = chip.dataset.cat;
      renderCategoryChips();
      renderProductGrid();
    });
    document.getElementById('posProductGrid').addEventListener('click', function (e) {
      const tile = e.target.closest('[data-add]');
      if (tile && !tile.disabled) addToCart(tile.dataset.add);
    });
    document.getElementById('cartList').addEventListener('click', function (e) {
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      const rem = e.target.closest('[data-remove]');
      if (inc) changeQty(parseInt(inc.dataset.inc, 10), 1);
      else if (dec) changeQty(parseInt(dec.dataset.dec, 10), -1);
      else if (rem) removeLine(parseInt(rem.dataset.remove, 10));
    });
    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    document.getElementById('payDiscount').addEventListener('input', updateTotals);
    document.getElementById('payAmountReceived').addEventListener('input', updateChange);
    document.getElementById('paymentMethodGrid').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-pay]');
      if (!btn) return;
      selectedPayment = btn.dataset.pay;
      renderPaymentMethods();
    });
    document.getElementById('completeSaleBtn').addEventListener('click', completeSale);
    document.getElementById('newSaleBtn').addEventListener('click', function () {
      document.getElementById('saleSuccessOverlay').classList.remove('open');
      switchPosTab('browse');
    });
    document.querySelectorAll('#posMobileTabs button').forEach(function (btn) {
      btn.addEventListener('click', function () { switchPosTab(btn.dataset.postab); });
    });
  });
})();
