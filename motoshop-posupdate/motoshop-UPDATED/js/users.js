/* ==========================================================================
   users.js — powers users.html (Admin only)
   ========================================================================== */
(function () {
  if (!initShell('users')) return;
  if (!requireRole('Admin')) return;

  let editingUserId = null;

  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  function renderTable() {
    const q = document.getElementById('userSearch').value.trim().toLowerCase();
    const users = Store.get('users', []).filter(u => !q || u.name.toLowerCase().indexOf(q) !== -1 || u.username.toLowerCase().indexOf(q) !== -1);
    const tbody = document.getElementById('usersTbody');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">' + icon('users') + '<h3>No users found</h3></div></td></tr>';
      return;
    }
    const me = getSession();
    tbody.innerHTML = users.map(u => {
      return '<tr>' +
        '<td><div class="cell-product"><div class="avatar" style="width:30px;height:30px;border-radius:999px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.72rem;flex-shrink:0;">' + initials(u.name) + '</div>' +
        '<span style="font-weight:600;color:var(--ink);">' + Utils.escapeHtml(u.name) + (u.username === me.username ? ' <span class="hint" style="display:inline;">(you)</span>' : '') + '</span></div></td>' +
        '<td class="text-muted">' + Utils.escapeHtml(u.username) + '</td>' +
        '<td class="text-muted">' + Utils.escapeHtml(u.email) + '</td>' +
        '<td><span class="badge badge-neutral">' + u.role + '</span></td>' +
        '<td class="text-muted">' + Utils.formatDate(u.dateAdded) + '</td>' +
        '<td><span class="badge ' + (u.status === 'Active' ? 'badge-ok' : 'badge-neutral') + '">' + u.status + '</span></td>' +
        '<td><button class="icon-btn" title="Edit" data-edit="' + u.id + '">' + icon('edit') + '</button></td>' +
      '</tr>';
    }).join('');
  }

  function openUserModal(mode, userId) {
    editingUserId = mode === 'edit' ? userId : null;
    document.getElementById('userForm').reset();
    document.getElementById('userModalTitle').textContent = mode === 'edit' ? 'Edit User' : 'Add User';
    const passwordInput = document.getElementById('uPassword');
    const confirmInput = document.getElementById('uConfirmPassword');
    const passwordHint = document.getElementById('userPasswordHint');
    if (mode === 'edit') {
      const u = Store.get('users', []).find(x => x.id === userId);
      if (!u) return;
      document.getElementById('uName').value = u.name;
      document.getElementById('uUsername').value = u.username;
      document.getElementById('uEmail').value = u.email;
      document.getElementById('uRole').value = u.role;
      document.getElementById('uStatus').value = u.status;
      passwordInput.required = false;
      confirmInput.required = false;
      passwordInput.placeholder = 'Leave blank to keep current password';
      confirmInput.placeholder = 'Leave blank to keep current password';
      if (passwordHint) passwordHint.textContent = 'Leave password fields blank to keep the current password. Fill both only if changing it.';
    } else {
      document.getElementById('uRole').value = 'Staff';
      document.getElementById('uStatus').value = 'Active';
      passwordInput.required = true;
      confirmInput.required = true;
      passwordInput.placeholder = 'Enter password';
      confirmInput.placeholder = 'Re-enter password';
      if (passwordHint) passwordHint.textContent = 'Password and confirm password are required when adding a new account.';
    }
    openModal('userModalOverlay');
  }

  /* Password helpers — structured for a future database backend.
     When a real API exists, replace these with hashed password columns
     (e.g. password_hash, password_updated_at) instead of plain storage. */
  function readPasswordFields() {
    const password = (document.getElementById('uPassword').value || '').trim();
    const confirmPassword = (document.getElementById('uConfirmPassword').value || '').trim();
    return { password: password, confirmPassword: confirmPassword };
  }

  function validatePasswordFields(isNewUser) {
    const fields = readPasswordFields();
    const password = fields.password;
    const confirmPassword = fields.confirmPassword;
    const passwordField = document.getElementById('uPassword').closest('.field');
    const confirmField = document.getElementById('uConfirmPassword').closest('.field');

    function setFieldError(fieldEl, message) {
      if (!fieldEl) return;
      fieldEl.classList.add('has-error');
      let msg = fieldEl.querySelector('.field-error-msg');
      if (!msg) {
        msg = document.createElement('div');
        msg.className = 'field-error-msg';
        fieldEl.appendChild(msg);
      }
      msg.textContent = message;
    }
    function clearFieldError(fieldEl) {
      if (!fieldEl) return;
      fieldEl.classList.remove('has-error');
      const msg = fieldEl.querySelector('.field-error-msg');
      if (msg) msg.remove();
    }

    clearFieldError(passwordField);
    clearFieldError(confirmField);

    if (isNewUser) {
      if (!password) {
        setFieldError(passwordField, 'Password is required.');
        return null;
      }
      if (!confirmPassword) {
        setFieldError(confirmField, 'Confirm password is required.');
        return null;
      }
    } else if (!password && !confirmPassword) {
      // Editing and both blank — keep existing password
      return { skipPassword: true };
    } else if (!password || !confirmPassword) {
      if (!password) setFieldError(passwordField, 'Enter a new password or leave both blank.');
      if (!confirmPassword) setFieldError(confirmField, 'Confirm the new password or leave both blank.');
      return null;
    }

    if (password !== confirmPassword) {
      setFieldError(confirmField, 'Passwords do not match.');
      return null;
    }
    if (password.length < 6) {
      setFieldError(passwordField, 'Password must be at least 6 characters.');
      return null;
    }

    // Future DB fields: store alongside the user record until a real hash pipeline exists
    const passwordForDb = password;
    const passwordHashForDb = null; // TODO: hash with bcrypt/argon2 on the backend
    const passwordUpdatedAt = Utils.demoNow().toISOString();

    return {
      skipPassword: false,
      password: passwordForDb,
      passwordHash: passwordHashForDb,
      passwordUpdatedAt: passwordUpdatedAt
    };
  }

  function saveUser() {
    const form = document.getElementById('userForm');
    if (!validateForm(form)) return;

    const isNewUser = !editingUserId;
    const passwordResult = validatePasswordFields(isNewUser);
    if (!passwordResult) return;

    const users = Store.get('users', []);
    const payload = {
      name: document.getElementById('uName').value.trim(),
      username: document.getElementById('uUsername').value.trim(),
      email: document.getElementById('uEmail').value.trim(),
      role: document.getElementById('uRole').value,
      status: document.getElementById('uStatus').value
    };

    // Attach password fields for future database persistence
    if (!passwordResult.skipPassword) {
      payload.password = passwordResult.password;
      payload.passwordHash = passwordResult.passwordHash;
      payload.passwordUpdatedAt = passwordResult.passwordUpdatedAt;
    }

    if (editingUserId) {
      const idx = users.findIndex(u => u.id === editingUserId);
      if (idx > -1) users[idx] = Object.assign({}, users[idx], payload);
      showToast('Updated ' + payload.name + '.', 'ok');
    } else {
      const newId = Utils.nextId('USR', users.map(u => u.id), 3);
      users.push(Object.assign({ id: newId, dateAdded: Utils.demoNow().toISOString().slice(0, 10) }, payload));
      showToast('Added ' + payload.name + ' as ' + payload.role + '.', 'ok');
    }
    Store.set('users', users);
    closeModal('userModalOverlay');
    renderTable();
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderTable();
    document.getElementById('userSearch').addEventListener('input', renderTable);
    document.getElementById('addUserBtn').addEventListener('click', function () { openUserModal('add'); });
    document.getElementById('saveUserBtn').addEventListener('click', saveUser);
    document.getElementById('usersTbody').addEventListener('click', function (e) {
      const editBtn = e.target.closest('[data-edit]');
      if (editBtn) openUserModal('edit', editBtn.dataset.edit);
    });
    document.querySelectorAll('[data-close]').forEach(function (btn) { btn.addEventListener('click', function () { closeModal(btn.dataset.close); }); });
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(overlay.id); });
    });
  });
})();
