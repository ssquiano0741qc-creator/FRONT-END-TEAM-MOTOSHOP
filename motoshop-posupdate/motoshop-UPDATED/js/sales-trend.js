/* ==========================================================================
   sales-trend.js — Sales Analysis tab trend chart (1 Week / 1 Month / 1 Year)
   Loaded after sales.js; owns #analysisChart and the #analysisRange chips.
   Same ranges, labels and aggregation as the Dashboard trend.
   ========================================================================== */
(function () {
  const chartEl = document.getElementById('analysisChart');
  const rowEl = document.getElementById('analysisRange');
  if (!chartEl || !rowEl || typeof Store === 'undefined') return;

  const sales = Store.get('sales', []);
  const now = Utils.demoNow();
  const titles = { week: 'Sales Trend — Last 7 Days', month: 'Sales Trend — Last 30 Days', year: 'Sales Trend — Last 12 Months' };

  function render(range) {
    let buckets, dense = false, yearly = false;
    if (range === 'year') { buckets = Analytics.monthlyTotals(sales, now, 12); yearly = true; }
    else if (range === 'month') { buckets = Analytics.dailyTotals(sales, now, 30); dense = true; }
    else { buckets = Analytics.dailyTotals(sales, now, 7); }

    const maxTotal = Math.max(1, ...buckets.map(function (d) { return d.total; }));
    chartEl.className = 'bar-chart' + (dense ? ' is-dense' : '') + (yearly ? ' is-yearly' : '');
    chartEl.innerHTML = buckets.map(function (d, idx) {
      const pct = Math.round((d.total / maxTotal) * 100);
      const isPeak = d.total === maxTotal && d.total > 0;
      let label = d.label;
      if (dense) {
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
    document.getElementById('analysisTrendTitle').textContent = titles[range];
  }

  // Capture phase: take over chip clicks so any older 7/14-day handler in sales.js is bypassed.
  rowEl.addEventListener('click', function (e) {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    e.stopPropagation();
    rowEl.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
    chip.classList.add('active');
    render(chip.dataset.range);
  }, true);

  render('week');
})();
