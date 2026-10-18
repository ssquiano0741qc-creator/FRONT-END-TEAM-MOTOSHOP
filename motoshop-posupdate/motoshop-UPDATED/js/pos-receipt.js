/* ==========================================================================
   pos-receipt.js — payment-screen extras for pos.html

   Loaded AFTER js/pos.js and deliberately additive: pos.js is not modified.
   It never changes the cart or the sale; it only
     - mirrors the cart / totals into the new payment screen (Total Amount Due, Order Summary,
       Change, Total Paid, Receipt Preview),
     - wires the quick-denomination, clear and Order-Summary quantity buttons by driving the
       controls pos.js already owns (so all stock and total rules stay in pos.js),
     - prints the receipt, both the preview and the receipt of a completed sale.

   Recording the sale is still done by pos.js (completeSale): it writes the sale to the "sales"
   collection and lowers each product's stock + logs an inventory transaction in the Store, which is
   what the Sales and Inventory pages read. Nothing here duplicates that.

   PRINTING — NOTE: printReceipt() currently opens the browser's print dialog (window.print()) and
   prints only the receipt, laid out for an 80 mm roll (see "Receipt" in css/style.css). It is expected
   to be connected to an actual receipt printer later (for example by sending the same receipt data
   to a small PHP script that talks to the printer), but that is NOT done yet. printReceipt() is the
   single place to swap that in.
   ========================================================================== */
(function () {
  'use strict';
  if (!document.getElementById('receiptPreview')) return;   // not the POS page

  /* Shop details printed on the receipt. These are the placeholder values from the mockup —
     replace them with the real business details (and the real VAT registration number). */
  const RECEIPT_SHOP = {
    tagline: 'MOTORCYCLE PARTS & ACCESSORIES SHOP',
    address: ['1234 Highway, Brgy. San Isidro', 'Quezon City, Metro Manila'],
    taxId: 'VAT REG. TIN: 123-456-789-00000',
    footer: ['Thank you for your purchase!', 'Ride \u2022 Repair \u2022 Repeat']
  };

  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) { return Utils.escapeHtml(s); };
  const round2 = function (n) { return Math.round(n * 100) / 100; };
  const peso = function (n) {
    return '\u20B1' + (Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const parseMoney = function (t) { return parseFloat(String(t || '').replace(/[^0-9.]/g, '')) || 0; };

  let lastTender = 0;   // cash typed for the sale in progress (pos.js clears the box without firing an event)
  let lastSale = null;  // { sale, tender } for the sale that was just completed

  /* ---------- Read the order that pos.js is currently showing ---------- */
  function readOrder() {
    const products = Store.get('products', []);
    const items = Array.prototype.map.call(document.querySelectorAll('#cartList .cart-line'), function (el, i) {
      const name = ((el.querySelector('.cl-name') || {}).textContent || '').trim();
      const shown = parseMoney((el.querySelector('.cl-price') || {}).textContent);
      const qty = parseInt((el.querySelector('.qty-stepper span') || {}).textContent, 10) || 1;
      // The cart shows whole pesos, so take the exact price from the product record when we can.
      const match = products.find(function (p) { return p.name === name && Math.round(p.sellingPrice) === Math.round(shown); });
      const price = match ? match.sellingPrice : shown;
      const thumb = el.querySelector('.cl-thumb');
      return { index: i, name: name, qty: qty, price: price, subtotal: round2(price * qty), thumb: thumb ? thumb.outerHTML : '' };
    });
    const subtotal = round2(items.reduce(function (s, it) { return s + it.subtotal; }, 0));
    const discount = Math.max(0, Math.min(parseFloat($('payDiscount').value) || 0, subtotal));   // same rule as pos.js
    const total = round2(subtotal - discount);
    const selected = document.querySelector('#paymentMethodGrid .payment-method-btn.selected');
    const method = selected ? selected.getAttribute('data-pay') : 'Cash';
    const tendered = method === 'Cash' ? (parseFloat($('payAmountReceived').value) || 0) : total;
    const change = method === 'Cash' ? Math.max(0, round2(tendered - total)) : 0;
    return { items: items, subtotal: subtotal, discount: discount, total: total, method: method, tendered: tendered, change: change };
  }

  /* ---------- Receipt markup (preview + print share it) ---------- */
  function receiptHTML(d) {
    const dateStr = d.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const timeStr = d.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const rows = d.items.length ? d.items.map(function (it) {
      return '<tr><td>' + it.qty + '</td><td>' + esc(it.name) + '</td><td class="r">' + peso(it.price) + '</td><td class="r">' + peso(it.subtotal) + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="rcpt-none">No items yet</td></tr>';
    return '<div class="rcpt">' +
      '<img class="rcpt-logo" src="img/receipt-logo.png" alt="TeamMotor Motorcycle Shop">' +
      '<div class="rcpt-shop">' + esc(RECEIPT_SHOP.tagline) + '<br>' + RECEIPT_SHOP.address.map(esc).join('<br>') + '<br>' + esc(RECEIPT_SHOP.taxId) + '</div>' +
      '<div class="rcpt-head"><strong>SALE INVOICE</strong><span>No. ' + esc(d.no) + '</span></div>' +
      '<div class="rcpt-meta"><span>Date</span><span>: ' + dateStr + '</span><span>Time</span><span>: ' + timeStr + '</span><span>Cashier</span><span>: ' + esc(d.cashier) + '</span></div>' +
      '<table class="rcpt-items"><thead><tr><th>Qty</th><th>Description</th><th class="r">Price</th><th class="r">Amount</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="rcpt-sums">' +
        '<div><span>Subtotal</span><span>' + peso(d.subtotal) + '</span></div>' +
        '<div><span>Discount</span><span>' + peso(d.discount) + '</span></div>' +
        '<div class="rcpt-total"><span>TOTAL</span><span>' + peso(d.total) + '</span></div>' +
        '<div><span>Payment Method</span><span>' + esc(d.method) + '</span></div>' +
        '<div><span>Amount Tendered</span><span>' + peso(d.tendered) + '</span></div>' +
        '<div><span>Change</span><span>' + peso(d.change) + '</span></div>' +
      '</div>' +
      '<div class="rcpt-foot">' + RECEIPT_SHOP.footer.map(esc).join('<br>') + '</div>' +
    '</div>';
  }

  function previewData(o) {
    const session = getSession();
    return {
      no: ($('posMetaTxnNumber').textContent || '').replace(/^TXN-/, ''),
      date: Utils.demoNow(), cashier: session ? session.name : '',
      items: o.items, subtotal: o.subtotal, discount: o.discount, total: o.total,
      method: o.method, tendered: o.tendered, change: o.change
    };
  }

  function dataFromSale(sale, tender) {
    const isCash = sale.paymentMethod === 'Cash';
    const tendered = isCash ? Math.max(tender, sale.total) : sale.total;
    return {
      no: String(sale.id).split('-')[1], date: new Date(sale.date), cashier: sale.staff,
      items: sale.items.map(function (i) { return { name: i.name, qty: i.qty, price: i.price, subtotal: i.subtotal }; }),
      subtotal: sale.subtotal, discount: sale.discount, total: sale.total,
      method: sale.paymentMethod, tendered: tendered, change: isCash ? Math.max(0, round2(tendered - sale.total)) : 0
    };
  }

  /* ---------- Print ---------- */
  function printReceipt(d) {
    let area = $('receiptPrintArea');
    if (!area) {
      area = document.createElement('div');
      area.id = 'receiptPrintArea';
      document.body.appendChild(area);
    }
    area.innerHTML = receiptHTML(d);
    const pending = Array.prototype.filter.call(area.querySelectorAll('img'), function (img) { return !img.complete; });
    Promise.all(pending.map(function (img) {
      return new Promise(function (resolve) { img.onload = img.onerror = resolve; });
    })).then(function () {
      const cleanup = function () { area.innerHTML = ''; window.removeEventListener('afterprint', cleanup); };
      window.addEventListener('afterprint', cleanup);
      window.print();
    });
  }

  /* ---------- Keep the payment screen in step with the cart ---------- */
  function refresh() {
    const o = readOrder();
    const count = o.items.reduce(function (s, it) { return s + it.qty; }, 0);

    $('payDueAmount').textContent = peso(o.total);
    $('orderItemBadge').textContent = count + (count === 1 ? ' Item' : ' Items');
    $('orderSummaryBody').innerHTML = o.items.length ? o.items.map(function (it, n) {
      return '<tr><td class="os-no">' + (n + 1) + '</td>' +
        '<td><div class="os-item"><span class="os-thumb">' + it.thumb + '</span><span class="os-name">' + esc(it.name) + '</span></div></td>' +
        '<td><div class="os-qty"><button type="button" data-os-dec="' + it.index + '" aria-label="Decrease quantity of ' + esc(it.name) + '">\u2212</button><span>' + it.qty + '</span>' +
        '<button type="button" data-os-inc="' + it.index + '" aria-label="Increase quantity of ' + esc(it.name) + '">+</button></div></td>' +
        '<td class="num">' + peso(it.price) + '</td><td class="num">' + peso(it.subtotal) + '</td></tr>';
    }).join('') : '<tr><td colspan="5" class="rcpt-none">No items yet. Go back to the cart and add some.</td></tr>';
    $('osSubtotal').textContent = peso(o.subtotal);
    $('osDiscount').textContent = peso(o.discount);
    $('osTotal').textContent = peso(o.total);

    $('payTotalPaid').textContent = peso(o.method === 'Cash' ? o.tendered : 0);
    const change = $('payChange');           // pos.js writes this whole-peso; show centavos like the rest of the screen
    const wantChange = peso(o.change);
    if (change.textContent !== wantChange) change.textContent = wantChange;

    $('receiptPreview').innerHTML = receiptHTML(previewData(o));
    $('printReceiptBtn').disabled = !o.items.length;

    const pct = $('discountPct');
    pct.textContent = o.discount > 0 && o.subtotal > 0 ? (Math.round(o.discount / o.subtotal * 1000) / 10) + '%' : '';
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    Promise.resolve().then(function () { queued = false; refresh(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    const observer = new MutationObserver(schedule);
    ['cartList', 'paySubtotal', 'payTotal', 'paymentMethodGrid', 'payChange'].forEach(function (id) {
      if ($(id)) observer.observe($(id), { childList: true, subtree: true, characterData: true });
    });
    document.addEventListener('input', function (e) {
      const id = e.target && e.target.id;
      if (id === 'payAmountReceived') lastTender = parseFloat(e.target.value) || 0;
      if (id === 'payAmountReceived' || id === 'payDiscount') schedule();
    });
    setInterval(schedule, 30000);   // keeps the preview's time current

    /* Quick denominations add to the tendered cash; "Exact Amount" sets it to the total due. */
    const tender = $('payAmountReceived');
    function setTender(value) {
      tender.value = value > 0 ? String(round2(value)) : '';
      tender.dispatchEvent(new Event('input', { bubbles: true }));   // pos.js recalculates change from this
    }
    document.querySelector('.quick-row').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-quick]');
      if (!btn) return;
      if (btn.dataset.quick === 'exact') setTender(readOrder().total);
      else setTender((parseFloat(tender.value) || 0) + parseInt(btn.dataset.quick, 10));
    });
    $('tenderClearBtn').addEventListener('click', function () { setTender(0); tender.focus(); });

    /* Quantity buttons in the Order Summary press the matching buttons in the cart, so pos.js
       applies its usual stock checks and updates everything. */
    $('orderSummaryBody').addEventListener('click', function (e) {
      const inc = e.target.closest('[data-os-inc]');
      const dec = e.target.closest('[data-os-dec]');
      const target = inc ? document.querySelector('#cartList [data-inc="' + inc.dataset.osInc + '"]')
                   : dec ? document.querySelector('#cartList [data-dec="' + dec.dataset.osDec + '"]') : null;
      if (target) target.click();
    });

    $('printReceiptBtn').addEventListener('click', function () { printReceipt(previewData(readOrder())); });

    /* When pos.js completes a sale it opens the success modal. Grab the sale it just stored so the
       final receipt (real transaction number, items, change) can be printed from the modal. */
    const overlay = $('saleSuccessOverlay');
    new MutationObserver(function () {
      if (!overlay.classList.contains('open')) return;
      const sale = Store.get('sales', [])[0];
      lastSale = sale ? { sale: sale, tender: lastTender } : null;
      lastTender = 0;
      $('printSaleReceiptBtn').disabled = !lastSale;
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
    $('printSaleReceiptBtn').addEventListener('click', function () {
      if (lastSale) printReceipt(dataFromSale(lastSale.sale, lastSale.tender));
    });

    /* After "Start New Sale", return from the payment screen to the products screen. */
    $('newSaleBtn').addEventListener('click', function () {
      if (location.hash === '#payment') location.hash = '';
    });

    refresh();
  });
})();
