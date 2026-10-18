/* ==========================================================================
   notifications.js
   ----------------------------------------------------------------------
   Drives the bell icon in the topbar. Alerts are recomputed from current
   stock every time the panel renders, so a POS sale or stock-out that
   crosses the reorder level shows up immediately — read/unread state is
   preserved for alerts that were already there.
   ========================================================================== */
const Notifications = (function () {

  function recompute() {
    const products = Store.get('products', []);
    const existing = Store.get('notifications', []);
    let maxNum = existing.reduce((max, n) => {
      const m = String(n.id).match(/NTF-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);

    const fresh = [];
    products.filter(function (p) { return !p.archived; }).forEach(p => {
      const status = Utils.getStockStatus(p.stock, p.reorderLevel);
      let type = null, title = '', message = '';
      if (status === 'Out of Stock') {
        type = 'out-of-stock'; title = 'Out of Stock'; message = p.name + ' is now out of stock.';
      } else if (status === 'Low Stock') {
        type = 'low-stock'; title = 'Low Stock'; message = p.name + ' has ' + p.stock + (p.stock === 1 ? ' unit' : ' units') + ' remaining.';
      } else if (p.stock <= p.reorderLevel * 1.5) {
        type = 'restock-reminder'; title = 'Restock Reminder'; message = p.name + ' is approaching its reorder level.';
      }
      if (type) {
        const already = existing.find(n => n.productId === p.id && n.type === type);
        if (already) {
          fresh.push(already);
        } else {
          maxNum++;
          fresh.push({ id: 'NTF-' + Utils.pad(maxNum, 3), type, productId: p.id, title, message, date: Utils.demoNow().toISOString(), read: false, link: 'inventory.html' });
        }
      }
    });

    const warranties = Store.get('warranties', []);
    const customers = Store.get('customers', []);
    warranties.filter(function (w) { return w.status === 'Expiring Soon'; }).forEach(function (w) {
      const c = customers.find(function (x) { return x.id === w.customerId; });
      const p = products.find(function (x) { return x.id === w.productId; });
      const already = existing.find(function (n) { return n.warrantyId === w.id && n.type === 'warranty-expiring'; });
      if (already) {
        fresh.push(already);
      } else {
        maxNum++;
        fresh.push({
          id: 'NTF-' + Utils.pad(maxNum, 3), type: 'warranty-expiring', warrantyId: w.id,
          title: 'Warranty Expiring Soon',
          message: (p ? p.name : (w.productName || 'A motorcycle')) + ' (' + (c ? c.name : 'customer') + ') expires ' + Utils.formatDate(w.warrantyExpiration) + '.',
          date: Utils.demoNow().toISOString(), read: false, link: 'warranty.html'
        });
      }
    });

    fresh.sort((a, b) => new Date(b.date) - new Date(a.date));
    Store.set('notifications', fresh);
    return fresh;
  }

  function render() {
    const notifs = recompute();
    const unread = notifs.filter(n => !n.read).length;
    const dotHolder = document.getElementById('notifDot');
    if (dotHolder) {
      dotHolder.className = 'notif-dot';
      dotHolder.textContent = unread > 0 ? (unread > 9 ? '9+' : String(unread)) : '';
      dotHolder.style.display = unread > 0 ? 'flex' : 'none';
    }

    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    const listHtml = notifs.length
      ? notifs.slice(0, 25).map(n => {
          const tone = n.type === 'restock-reminder' ? 'warn' : n.type === 'warranty-expiring' ? 'warn' : 'danger';
          return '<div class="notif-item tone-' + tone + '" data-link="' + (n.link || '') + '" data-notif-id="' + n.id + '" style="cursor:' + (n.link ? 'pointer' : 'default') + ';">' +
            '<span class="dot"></span>' +
            '<div class="body"><strong>' + Utils.escapeHtml(n.title) + '</strong>' +
            '<p>' + Utils.escapeHtml(n.message) + '</p>' +
            '<time>' + Utils.timeAgo(n.date) + '</time></div></div>';
        }).join('')
      : '<div class="empty-state">' + icon('bell') + '<h3>All caught up</h3><p>No stock alerts right now.</p></div>';

    panel.innerHTML =
      '<div class="notif-panel-header"><h3>Notifications</h3>' +
      '<button type="button" id="markAllReadBtn" class="btn-sm btn-ghost">Mark all read</button></div>' +
      '<div class="notif-list">' + listHtml + '</div>' +
      '<div class="notif-panel-footer"><span style="color:var(--steel);font-size:.74rem;">Alerts update automatically as stock changes</span></div>';

    panel.querySelectorAll('.notif-item[data-link]').forEach(function (item) {
      item.addEventListener('click', function () {
        const link = item.dataset.link;
        if (link) window.location.href = link;
      });
    });

    const markBtn = document.getElementById('markAllReadBtn');
    if (markBtn) {
      markBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        markAllRead();
      });
    }
  }

  function markAllRead() {
    const notifs = Store.get('notifications', []).map(n => Object.assign({}, n, { read: true }));
    Store.set('notifications', notifs);
    render();
  }

  function init() {
    render();
    const bell = document.getElementById('notifBell');
    if (bell) {
      bell.addEventListener('click', (e) => {
        e.stopPropagation();
        const panel = document.getElementById('notifPanel');
        const accountDropdown = document.getElementById('accountDropdown');
        if (accountDropdown) accountDropdown.classList.remove('open');
        render();
        panel.classList.toggle('open');
      });
    }
    document.addEventListener('click', () => {
      const panel = document.getElementById('notifPanel');
      if (panel) panel.classList.remove('open');
    });
  }

  return { init, render, recompute, markAllRead };
})();
/* Explicit window property: notifications.js uses `const`, and top-level
   const/let bindings do NOT auto-attach to window like var/function
   declarations do. Other pages check `window.Notifications` before
   calling in, so this line is what makes that check actually work. */
window.Notifications = Notifications;
