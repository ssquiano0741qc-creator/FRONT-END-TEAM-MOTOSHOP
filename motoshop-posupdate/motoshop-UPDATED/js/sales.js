/* ==========================================================================
   sales.js — powers sales.html
   ========================================================================== */
(function () {
  if (!initShell('sales')) return;

  const products = Store.get('products', []).filter(function (p) { return !p.archived; });
  const sales = Store.get('sales', []);
  const now = Utils.demoNow();

  /* ---------- Overview stats ---------- */
  const today = Analytics.salesToday(sales, now);
  const week = Analytics.salesInLastDays(sales, now, 7);
  const month = Analytics.salesInCurrentMonth(sales, now);
  const stats = [
    { label: "Today's Sales", value: Utils.formatPHP(Analytics.sumTotal(today)), sub: today.length + ' transaction' + (today.length === 1 ? '' : 's'), iconName: 'trendUp', tone: 'ok' },
    { label: 'Weekly Sales', value: Utils.formatPHP(Analytics.sumTotal(week)), sub: week.length + ' transactions', iconName: 'sales', tone: 'accent' },
    { label: 'Monthly Sales', value: Utils.formatPHP(Analytics.sumTotal(month)), sub: month.length + ' transactions', iconName: 'sales', tone: 'accent' },
    { label: 'Total Transactions', value: sales.length, sub: 'All-time in this prototype', iconName: 'cart', tone: 'warn' },
    { label: 'Average Transaction', value: Utils.formatPHP(sales.length ? Analytics.sumTotal(sales) / sales.length : 0), sub: 'Per completed sale', iconName: 'trendUp', tone: 'accent' }
  ];
  document.getElementById('salesStatGrid').className = 'stat-grid stat-grid-5';
  document.getElementById('salesStatGrid').innerHTML = stats.map(s =>
    '<div class="stat-card tone-' + s.tone + '">' +
      '<div class="stat-icon tone-' + s.tone + '">' + icon(s.iconName) + '</div>' +
      '<div class="stat-label">' + s.label + '</div>' +
      '<div class="stat-value">' + s.value + '</div>' +
      '<div class="stat-sub">' + s.sub + '</div>' +
    '</div>'
  ).join('');

  /* ---------- Recent orders ---------- */
  const recent = Analytics.recentSales(sales, 10);
  document.getElementById('recentOrdersTbody').innerHTML = recent.length
    ? recent.map(s => {
        const itemSummary = s.items.length === 1 ? s.items[0].name : s.items[0].name + ' +' + (s.items.length - 1) + ' more';
        return '<tr><td style="font-weight:700;color:var(--ink);">' + s.id + '</td>' +
          '<td class="text-muted">' + Utils.formatDateTime(s.date) + '</td>' +
          '<td>' + Utils.escapeHtml(itemSummary) + '</td>' +
          '<td>' + Utils.escapeHtml(s.staff) + '</td>' +
          '<td><span class="pay-chip">' + s.paymentMethod + '</span></td>' +
          '<td class="text-right mono-num" style="font-weight:700;">' + Utils.formatPHP(s.total) + '</td></tr>';
      }).join('')
    : '<tr><td colspan="6"><div class="empty-state">' + icon('sales') + '<h3>No sales yet</h3></div></td></tr>';

  /* ---------- Payment method summary ---------- */
  function renderPaymentSummary() {
    const summary = Analytics.paymentMethodSummary(sales);
    const totalAll = Object.keys(summary).reduce((s, k) => s + summary[k].total, 0) || 1;
    const methods = ['Cash', 'GCash', 'Bank Transfer'];
    document.getElementById('paymentSummary').innerHTML = methods.map(m => {
      const v = summary[m] || { count: 0, total: 0 };
      const pct = Math.round((v.total / totalAll) * 100);
      return '<div style="margin-bottom:16px;">' +
        '<div class="flex justify-between" style="margin-bottom:6px;">' +
          '<span style="font-weight:600;font-size:.85rem;color:var(--ink);">' + m + '</span>' +
          '<span style="font-size:.8rem;color:var(--steel);">' + v.count + ' orders &middot; ' + Utils.formatPHP(v.total) + '</span>' +
        '</div>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';
    }).join('');
  }
  renderPaymentSummary();

  /* ---------- Sales trend chart ---------- */
  function renderChart(days) {
    const daily = Analytics.dailyTotals(sales, now, days);
    const max = Math.max(1, ...daily.map(d => d.total));
    document.getElementById('analysisChart').innerHTML = daily.map(d => {
      const pct = Math.round((d.total / max) * 100);
      const isPeak = d.total === max && d.total > 0;
      return '<div class="bar-col"><div class="bar' + (isPeak ? ' is-peak' : '') + '" style="height:' + Math.max(pct, d.total > 0 ? 6 : 2) + '%">' +
        (d.total > 0 ? '<span class="bar-value">' + Utils.formatPHP(d.total) + '</span>' : '') +
        '</div><div class="bar-label">' + d.label + '</div></div>';
    }).join('');
  }
  renderChart(7);
  document.querySelectorAll('[data-range]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-range]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderChart(parseInt(chip.dataset.range, 10));
    });
  });

  /* ---------- Top sellers / slow movers ---------- */
  const ranked = Analytics.rankProductsBySales(products, sales);
  const top5 = ranked.slice(0, 5);
  const bottom5 = ranked.slice(-5).reverse();
  const maxSold = Math.max(1, top5[0] ? top5[0].unitsSold : 1);

  function hbarList(rows, slow) {
    if (!rows.length) return '<div class="empty-state">' + icon('sales') + '<h3>No sales data yet</h3></div>';
    return '<div class="hbar-list" style="margin-top:12px;">' + rows.map(r => {
      const pct = Math.max(4, Math.round((r.unitsSold / maxSold) * 100));
      return '<div class="hbar-row"><div class="hbar-name">' + Utils.escapeHtml(r.product.name) + '</div>' +
        '<div class="hbar-track"><div class="hbar-fill' + (slow ? ' slow' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="hbar-val">' + r.unitsSold + '</div></div>';
    }).join('') + '</div>';
  }
  document.getElementById('topSellersList').innerHTML = hbarList(top5, false);
  document.getElementById('slowMoversList').innerHTML = hbarList(bottom5, true);

  /* ---------- Product movement tables ---------- */
  function renderMovementTable(elementId, rows) {
    document.getElementById(elementId).innerHTML = rows.length
      ? rows.map(r => '<tr><td style="font-weight:600;color:var(--ink);">' + Utils.escapeHtml(r.product.name) + '</td>' +
          '<td class="text-right mono-num">' + r.unitsSold + '</td>' +
          '<td class="text-right mono-num">' + r.product.stock + '</td></tr>').join('')
      : '<tr><td colspan="3"><div class="empty-state">' + icon('sales') + '<h3>No data yet</h3></div></td></tr>';
  }
  renderMovementTable('fastMovingTbody', top5);
  renderMovementTable('slowMovingTbody', bottom5);

  /* ---------- Tabs ---------- */
  document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page > .tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
})();
