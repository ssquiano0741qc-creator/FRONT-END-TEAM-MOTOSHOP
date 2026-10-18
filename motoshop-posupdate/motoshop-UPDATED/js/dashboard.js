/* ==========================================================================
   dashboard.js — powers index.html (Dashboard)
   ========================================================================== */
(function () {
  if (!initShell('dashboard')) return;

  const products = Store.get('products', []).filter(function (p) { return !p.archived; });
  const sales = Store.get('sales', []);
  const customers = Store.get('customers', []);
  const warranties = Store.get('warranties', []);
  const now = Utils.demoNow();

  /* ---------- Stat cards ---------- */
  const lowStock = Analytics.lowStockProducts(products);
  const outOfStock = Analytics.outOfStockProducts(products);
  const todaySales = Analytics.salesToday(sales, now);
  const unitsSoldToday = todaySales.reduce(function (s, sale) { return s + sale.items.reduce(function (s2, i) { return s2 + i.qty; }, 0); }, 0);
  const upcomingWarranties = warranties.filter(function (w) { return w.status === 'Expiring Soon'; }).length;

  const stats = [
    { label: "Today's Sales", value: Utils.formatPHP(Analytics.sumTotal(todaySales)), sub: todaySales.length + ' transaction' + (todaySales.length === 1 ? '' : 's'), icon: 'trendUp', tone: 'ok' },
    { label: 'Total Products', value: products.length, sub: DEFAULT_DB.categories.length + ' categories', icon: 'box', tone: 'accent' },
    { label: 'Low Stock', value: lowStock.length, sub: 'Approaching reorder level', icon: 'alertTriangle', tone: 'warn' },
    { label: 'Out of Stock', value: outOfStock.length, sub: 'Needs immediate restock', icon: 'xCircle', tone: 'danger' },
    { label: 'Products Sold', value: unitsSoldToday, sub: 'Units sold today', icon: 'cart', tone: 'accent' },
    { label: 'Upcoming Warranties', value: upcomingWarranties, sub: 'Expiring soon', icon: 'shield', tone: 'warn' }
  ];
  document.getElementById('statGrid').innerHTML = stats.map(s =>
    '<div class="stat-card tone-' + s.tone + '">' +
      '<div class="stat-icon tone-' + s.tone + '">' + icon(s.icon) + '</div>' +
      '<div class="stat-label">' + s.label + '</div>' +
      '<div class="stat-value">' + s.value + '</div>' +
      '<div class="stat-sub">' + s.sub + '</div>' +
    '</div>'
  ).join('');

  /* ---------- Recent Sales (flattened to line-item rows) ---------- */
  const recentSales = Analytics.recentSales(sales, 12);
  const flatRows = [];
  recentSales.forEach(function (s) {
    s.items.forEach(function (i) {
      flatRows.push({ name: i.name, qty: i.qty, amount: i.subtotal, payment: s.paymentMethod, date: s.date });
    });
  });
  flatRows.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  document.getElementById('recentSalesTbody').innerHTML = flatRows.length
    ? flatRows.slice(0, 10).map(function (r) {
        return '<tr><td style="font-weight:600;color:var(--ink);">' + Utils.escapeHtml(r.name) + '</td>' +
          '<td class="text-right mono-num">' + r.qty + '</td>' +
          '<td class="text-right mono-num" style="font-weight:700;">' + Utils.formatPHP(r.amount) + '</td>' +
          '<td><span class="pay-chip">' + r.payment + '</span></td>' +
          '<td class="text-muted">' + Utils.formatDateTime(r.date) + '</td></tr>';
      }).join('')
    : '<tr><td colspan="5"><div class="empty-state">' + icon('sales') + '<h3>No sales yet</h3></div></td></tr>';

  /* ---------- Sales trend (1 Week / 1 Month / 1 Year) ---------- */
  const chartEl = document.getElementById('salesChart');
  function renderTrend(range) {
    let buckets, dense = false, yearly = false;
    if (range === 'year') { buckets = Analytics.monthlyTotals(sales, now, 12); yearly = true; }
    else if (range === 'month') { buckets = Analytics.dailyTotals(sales, now, 30); dense = true; }
    else { buckets = Analytics.dailyTotals(sales, now, 7); }

    const maxTotal = Math.max(1, ...buckets.map(d => d.total));
    chartEl.className = 'bar-chart' + (dense ? ' is-dense' : '') + (yearly ? ' is-yearly' : '');
    chartEl.innerHTML = buckets.map(function (d, idx) {
      const pct = Math.round((d.total / maxTotal) * 100);
      const isPeak = d.total === maxTotal && d.total > 0;
      let label = d.label;
      if (dense) {
        // day number; add the month name on the first bar and on the 1st of a month
        label = d.shortLabel + ((idx === 0 || d.shortLabel === '1') ? '<small>' + d.monthLabel + '</small>' : '');
      } else if (yearly && (idx === 0 || d.month === 0)) {
        label = d.label + '<small>' + d.year + '</small>';
      }
      return '<div class="bar-col" title="' + d.title + ': ' + Utils.formatPHP(d.total) + '">' +
        '<div class="bar' + (isPeak ? ' is-peak' : '') + '" style="height:' + Math.max(pct, d.total > 0 ? 6 : 2) + '%">' +
          (d.total > 0 && !dense ? '<span class="bar-value">' + Utils.formatPHP(d.total) + '</span>' : '') +
        '</div>' +
        '<div class="bar-label">' + label + '</div>' +
      '</div>';
    }).join('');
    const titles = { week: 'Sales Trend — Last 7 Days', month: 'Sales Trend — Last 30 Days', year: 'Sales Trend — Last 12 Months' };
    document.getElementById('salesTrendTitle').textContent = titles[range];
  }
  renderTrend('week');
  document.querySelectorAll('#trendRange .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('#trendRange .chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      renderTrend(chip.dataset.range);
    });
  });

  /* ---------- Inventory Attention ---------- */
  function productRow(p) {
    const status = Utils.getStockStatus(p.stock, p.reorderLevel);
    return '<li style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">' +
      '<div class="cell-product"><div class="cell-thumb thumb-' + p.category + '">' + icon('box') + '</div>' +
      '<div><div class="name" style="font-size:.85rem;">' + Utils.escapeHtml(p.name) + '</div>' +
      '<div class="sub">' + p.stock + ' left &middot; reorder at ' + p.reorderLevel + '</div></div></div>' +
      '<span class="badge ' + Utils.statusClass(status) + '">' + status + '</span>' +
    '</li>';
  }
  document.getElementById('panel-low').innerHTML = lowStock.length
    ? '<ul>' + lowStock.slice(0, 6).map(productRow).join('') + '</ul>'
    : '<div class="empty-state">' + icon('checkCircle') + '<h3>No low-stock items</h3></div>';
  document.getElementById('panel-out').innerHTML = outOfStock.length
    ? '<ul>' + outOfStock.slice(0, 6).map(productRow).join('') + '</ul>'
    : '<div class="empty-state">' + icon('checkCircle') + '<h3>Nothing out of stock</h3></div>';

  const recentStockIn = Store.get('inventoryTransactions', []).filter(function (t) { return t.type === 'Stock In' && t.reference !== 'Opening count'; }).slice(0, 6);
  document.getElementById('panel-stockin').innerHTML = recentStockIn.length
    ? '<ul>' + recentStockIn.map(function (t) {
        return '<li style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">' +
          '<div><div style="font-weight:600;font-size:.85rem;color:var(--ink);">' + Utils.escapeHtml(t.productName) + '</div>' +
          '<div class="hint" style="margin:0;">' + Utils.timeAgo(t.date) + (t.reference ? ' &middot; ' + Utils.escapeHtml(t.reference) : '') + '</div></div>' +
          '<span class="mono-num" style="font-weight:700;color:var(--ok);">+' + t.quantity + '</span></li>';
      }).join('') + '</ul>'
    : '<div class="empty-state">' + icon('stockIn') + '<h3>No recent stock-in</h3></div>';

  document.querySelectorAll('#attentionTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#attentionTabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('#panel-low, #panel-out, #panel-stockin, #panel-warranty').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  const expiringWarranties = warranties.filter(function (w) { return w.status === 'Expiring Soon' || w.status === 'Active'; })
    .sort(function (a, b) { return new Date(a.warrantyExpiration) - new Date(b.warrantyExpiration); }).slice(0, 6);
  document.getElementById('panel-warranty').innerHTML = expiringWarranties.length
    ? '<ul>' + expiringWarranties.map(function (w) {
        const c = customers.find(function (x) { return x.id === w.customerId; });
        const p = products.find(function (x) { return x.id === w.productId; }) || DEFAULT_DB.products.find(function (x) { return x.id === w.productId; }) || { name: w.productName || 'Motorcycle' };
        const daysLeft = Math.round((new Date(w.warrantyExpiration) - now) / 86400000);
        return '<li style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">' +
          '<div><div style="font-weight:600;font-size:.85rem;color:var(--ink);">' + Utils.escapeHtml(p.name) + '</div>' +
          '<div class="hint" style="margin:0;">' + Utils.escapeHtml(c.name) + ' &middot; expires ' + Utils.formatDate(w.warrantyExpiration) + '</div></div>' +
          '<span class="badge ' + (w.status === 'Expiring Soon' ? 'badge-warn' : 'badge-ok') + '">' + (daysLeft >= 0 ? daysLeft + 'd left' : w.status) + '</span></li>';
      }).join('') + '</ul>'
    : '<div class="empty-state">' + icon('shield') + '<h3>No upcoming warranty activity</h3></div>';

  /* ---------- Product Performance (sold + stock + fast/slow status) ---------- */
  const ranked = Analytics.rankProductsBySales(products, sales);
  const top = ranked.slice(0, 5);
  const bottom = ranked.slice(-5).reverse();
  const combined = top.concat(bottom.filter(function (r) { return top.indexOf(r) === -1; }));
  document.getElementById('performanceTbody').innerHTML = combined.length
    ? combined.map(function (r, idx) {
        const isFast = idx < top.length;
        return '<tr><td style="font-weight:600;color:var(--ink);">' + Utils.escapeHtml(r.product.name) + '</td>' +
          '<td class="text-right mono-num">' + r.unitsSold + '</td>' +
          '<td class="text-right mono-num">' + r.product.stock + '</td>' +
          '<td><span class="badge ' + (isFast ? 'badge-ok' : 'badge-neutral') + '">' + (isFast ? 'Fast Moving' : 'Slow Moving') + '</span></td></tr>';
      }).join('')
    : '<tr><td colspan="4"><div class="empty-state">' + icon('sales') + '<h3>No sales data yet</h3></div></td></tr>';
})();
