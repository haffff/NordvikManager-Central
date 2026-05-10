'use strict';

// ── Helpers ──────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function toast(msg, type = 'ok') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.className = ''; }, 3000);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function api(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  return res;
}

// ── Auth / init ───────────────────────────────────────────────────────────────

let currentUser = null;

async function checkAuth() {
  const res = await api('GET', '/api/user/checklogin');
  if (!res.ok) return false;
  const info = await (await api('GET', '/api/user/userinfo')).json();
  currentUser = info;
  return info.admin;
}

async function init() {
  const isAdmin = await checkAuth();
  if (isAdmin) {
    showApp();
  } else {
    $('login-screen').style.display = 'flex';
  }
}

function showApp() {
  $('login-screen').style.display = 'none';
  $('app').style.display = 'flex';
  $('header-who').textContent = currentUser ? `Logged in as ${currentUser.userName}` : '';
  loadUsers(1);
}

// ── Login ─────────────────────────────────────────────────────────────────────

$('login-btn').addEventListener('click', doLogin);
$('login-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const user = $('login-user').value.trim();
  const pass = $('login-pass').value;
  $('login-error').textContent = '';
  if (!user || !pass) { $('login-error').textContent = 'Enter username and password.'; return; }

  $('login-btn').disabled = true;
  const res = await api('POST', '/api/user/login', { UserName: user, password: pass });
  $('login-btn').disabled = false;

  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    $('login-error').textContent = j.error || 'Login failed.';
    return;
  }

  // verify admin
  const info = await (await api('GET', '/api/user/userinfo')).json();
  if (!info.admin) {
    $('login-error').textContent = 'Access denied — admin account required.';
    await api('GET', '/api/user/logout');
    return;
  }
  currentUser = info;
  showApp();
}

// ── Logout ────────────────────────────────────────────────────────────────────

$('logout-btn').addEventListener('click', async () => {
  await api('GET', '/api/user/logout');
  currentUser = null;
  $('app').style.display = 'none';
  $('login-screen').style.display = 'flex';
  $('login-pass').value = '';
});

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = $(`tab-${btn.dataset.tab}`);
    panel.classList.add('active');
    if (btn.dataset.tab === 'users') loadUsers(1);
    if (btn.dataset.tab === 'invites') loadInvites(1);
  });
});

// ── Users ─────────────────────────────────────────────────────────────────────

let userPage = 1;

async function loadUsers(page) {
  userPage = page;
  $('users-tbody').innerHTML = '<tr><td colspan="5" class="loading">Loading…</td></tr>';
  const res = await api('GET', `/api/user/users?page=${page}`);
  if (!res.ok) { $('users-tbody').innerHTML = '<tr><td colspan="5" class="loading">Failed to load.</td></tr>'; return; }
  const { data, total } = await res.json();
  renderUsers(data, total, page);
}

function renderUsers(users, total, page) {
  const tbody = $('users-tbody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">No users found.</td></tr>';
    renderUsersPagination(total, page);
    return;
  }

  tbody.innerHTML = users.map((u) => `
    <tr data-id="${u.id}" data-name="${escHtml(u.userName)}">
      <td><strong>${escHtml(u.userName)}</strong></td>
      <td>${u.email ? escHtml(u.email) : '<span style="color:var(--text-dim)">—</span>'}</td>
      <td>
        ${u.admin
          ? '<span class="badge badge-gold">Admin</span>'
          : '<span class="badge badge-dim">User</span>'}
      </td>
      <td style="color:var(--text-dim); font-size:.8rem">${fmtDate(u.createdAt)}</td>
      <td>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm toggle-admin-btn"
            data-id="${u.id}" data-admin="${u.admin}" data-self="${u.id === (currentUser && currentUser.id) ? '1' : '0'}">
            ${u.admin ? 'Revoke Admin' : 'Make Admin'}
          </button>
          <button class="btn btn-ghost btn-sm reset-pw-btn"
            data-id="${u.id}" data-name="${escHtml(u.userName)}">
            Reset PW
          </button>
          <button class="btn btn-red btn-sm delete-user-btn"
            data-id="${u.id}" data-name="${escHtml(u.userName)}"
            ${u.id === (currentUser && currentUser.id) ? 'disabled title="Cannot delete yourself"' : ''}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // wire up buttons
  tbody.querySelectorAll('.toggle-admin-btn').forEach((btn) => {
    btn.addEventListener('click', () => toggleAdmin(btn.dataset.id, btn.dataset.admin === 'true'));
  });
  tbody.querySelectorAll('.reset-pw-btn').forEach((btn) => {
    btn.addEventListener('click', () => openResetModal(btn.dataset.id, btn.dataset.name));
  });
  tbody.querySelectorAll('.delete-user-btn').forEach((btn) => {
    if (!btn.disabled) btn.addEventListener('click', () => deleteUser(btn.dataset.id, btn.dataset.name));
  });

  renderUsersPagination(total, page);
}

function renderUsersPagination(total, page) {
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  $('users-pagination').innerHTML =
    `<button class="btn btn-ghost btn-sm" ${page <= 1 ? 'disabled' : ''} id="uprev">← Prev</button>` +
    `<span>Page ${page} / ${pages} &nbsp;(${total} total)</span>` +
    `<button class="btn btn-ghost btn-sm" ${page >= pages ? 'disabled' : ''} id="unext">Next →</button>`;
  if (page > 1) $('uprev').addEventListener('click', () => loadUsers(page - 1));
  if (page < pages) $('unext').addEventListener('click', () => loadUsers(page + 1));
}

async function toggleAdmin(id, currentlyAdmin) {
  const res = await api('POST', '/api/user/toggleadmin', { userID: id, isAdmin: !currentlyAdmin });
  if (!res.ok) { const j = await res.json().catch(()=>({})); toast(j.error || 'Failed', 'err'); return; }
  toast(currentlyAdmin ? 'Admin revoked.' : 'Admin granted.', 'ok');
  loadUsers(userPage);
}

async function deleteUser(id, name) {
  if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
  const res = await api('DELETE', `/api/user/deleteuser?userID=${encodeURIComponent(id)}`);
  if (!res.ok) { const j = await res.json().catch(()=>({})); toast(j.error || 'Failed', 'err'); return; }
  toast('User deleted.', 'ok');
  loadUsers(userPage);
}

// ── Create user ───────────────────────────────────────────────────────────────

$('cu-btn').addEventListener('click', async () => {
  const userName = $('cu-username').value.trim();
  const email    = $('cu-email').value.trim();
  const password = $('cu-password').value;
  const isAdmin  = $('cu-admin').value === 'true';
  $('cu-error').textContent = '';

  if (!userName || !password) { $('cu-error').textContent = 'Username and password are required.'; return; }

  $('cu-btn').disabled = true;
  const res = await api('POST', '/api/user/createuser', { userName, email: email || undefined, password, isAdmin });
  $('cu-btn').disabled = false;

  if (!res.ok) {
    const j = await res.json().catch(()=>({}));
    $('cu-error').textContent = j.error || 'Failed to create user.';
    return;
  }
  toast('User created.', 'ok');
  $('cu-username').value = '';
  $('cu-email').value = '';
  $('cu-password').value = '';
  $('cu-admin').value = 'false';
  loadUsers(1);
});

// ── Reset password modal ──────────────────────────────────────────────────────

let resetTargetId = null;

function openResetModal(id, name) {
  resetTargetId = id;
  $('reset-username').textContent = name;
  $('reset-pw').value = '';
  $('reset-error').textContent = '';
  $('reset-modal').classList.add('open');
  setTimeout(() => $('reset-pw').focus(), 50);
}

$('reset-cancel').addEventListener('click', () => $('reset-modal').classList.remove('open'));
$('reset-modal').addEventListener('click', (e) => { if (e.target === $('reset-modal')) $('reset-modal').classList.remove('open'); });

$('reset-confirm').addEventListener('click', async () => {
  const pw = $('reset-pw').value;
  $('reset-error').textContent = '';
  if (!pw || pw.length < 6) { $('reset-error').textContent = 'Password must be at least 6 characters.'; return; }

  $('reset-confirm').disabled = true;
  const res = await api('POST', '/api/user/resetpassword', { userID: resetTargetId, newPassword: pw });
  $('reset-confirm').disabled = false;

  if (!res.ok) { const j = await res.json().catch(()=>({})); $('reset-error').textContent = j.error || 'Failed.'; return; }
  toast('Password reset.', 'ok');
  $('reset-modal').classList.remove('open');
});

// ── Invites ───────────────────────────────────────────────────────────────────

let invitePage = 1;

async function loadInvites(page) {
  invitePage = page;
  $('invites-tbody').innerHTML = '<tr><td colspan="5" class="loading">Loading…</td></tr>';
  const res = await api('GET', `/api/user/invites?page=${page}`);
  if (!res.ok) { $('invites-tbody').innerHTML = '<tr><td colspan="5" class="loading">Failed to load.</td></tr>'; return; }
  const { data, total } = await res.json();
  renderInvites(data, total, page);
}

function renderInvites(invites, total, page) {
  const tbody = $('invites-tbody');
  if (!invites.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">No invitations found.</td></tr>';
    renderInvitesPagination(total, page);
    return;
  }

  const now = new Date();
  tbody.innerHTML = invites.map((inv) => {
    const expired = new Date(inv.expires_at) < now;
    let statusBadge;
    if (inv.used) statusBadge = '<span class="badge badge-dim">Used</span>';
    else if (expired) statusBadge = '<span class="badge badge-red">Expired</span>';
    else statusBadge = '<span class="badge badge-green">Active</span>';

    return `
    <tr>
      <td>
        <span class="invite-key" title="Click to copy" style="cursor:pointer"
          data-key="${escHtml(inv.key)}">${escHtml(inv.key.slice(0, 8))}…</span>
      </td>
      <td style="color:var(--text-dim)">${escHtml(inv.created_by || '—')}</td>
      <td style="color:var(--text-dim); font-size:.8rem">${fmtDate(inv.expires_at)}</td>
      <td>${statusBadge}</td>
      <td>
        <div style="display:flex;gap:.4rem">
          <button class="btn btn-ghost btn-sm copy-inv-btn" data-key="${escHtml(inv.key)}">Copy</button>
          <button class="btn btn-red btn-sm del-inv-btn" data-key="${escHtml(inv.key)}">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.copy-inv-btn, .invite-key[data-key]').forEach((el) => {
    el.addEventListener('click', () => copyToClipboard(el.dataset.key));
  });
  tbody.querySelectorAll('.del-inv-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteInvite(btn.dataset.key));
  });

  renderInvitesPagination(total, page);
}

function renderInvitesPagination(total, page) {
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  $('invites-pagination').innerHTML =
    `<button class="btn btn-ghost btn-sm" ${page <= 1 ? 'disabled' : ''} id="iprev">← Prev</button>` +
    `<span>Page ${page} / ${pages} &nbsp;(${total} total)</span>` +
    `<button class="btn btn-ghost btn-sm" ${page >= pages ? 'disabled' : ''} id="inext">Next →</button>`;
  if (page > 1) $('iprev').addEventListener('click', () => loadInvites(page - 1));
  if (page < pages) $('inext').addEventListener('click', () => loadInvites(page + 1));
}

$('gen-invite-btn').addEventListener('click', async () => {
  const hours = parseInt($('inv-hours').value, 10) || 24;
  $('gen-invite-btn').disabled = true;
  const res = await api('GET', `/api/user/GenerateInvite?hours=${hours}`);
  $('gen-invite-btn').disabled = false;
  if (!res.ok) { toast('Failed to generate invite.', 'err'); return; }
  const { key } = await res.json();
  $('new-invite-key').textContent = key;
  $('new-invite-box').style.display = 'block';
  $('new-invite-key').onclick = () => copyToClipboard(key);
  toast('Invite generated.', 'ok');
  loadInvites(1);
});

async function deleteInvite(key) {
  if (!confirm('Delete this invitation?')) return;
  const res = await api('DELETE', `/api/user/deleteinvite?key=${encodeURIComponent(key)}`);
  if (!res.ok) { const j = await res.json().catch(()=>({})); toast(j.error || 'Failed', 'err'); return; }
  toast('Invite deleted.', 'ok');
  loadInvites(invitePage);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => toast('Copied to clipboard.', 'ok'),
    () => toast('Copy failed.', 'err'),
  );
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
