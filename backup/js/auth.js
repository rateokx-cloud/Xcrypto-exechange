// ============================================
// CRYPTOX - AUTH
// ============================================

// Use same base as api.js — avoid redeclaring API_BASE
function _getBase() { return (typeof API_BASE !== 'undefined') ? API_BASE : '/api'; }

// ============ CURRENT USER (synchronous) ============
function getCurrentUser() {
  // Try backend user first
  if (window._currentUser) return window._currentUser;
  // Try cached user from localStorage
  try {
    const cached = localStorage.getItem('cx_user');
    if (cached) {
      const user = JSON.parse(cached);
      window._currentUser = user;
      return user;
    }
  } catch(e) {}
  // Fallback: localStorage-only mode
  const id = localStorage.getItem('cx_session');
  if (!id) return null;
  const users = JSON.parse(localStorage.getItem('cx_users') || '[]');
  return users.find(u => u.id === id) || null;
}

// ============ INIT AUTH ON PAGE LOAD ============
async function initAuthOnLoad() {
  const token = localStorage.getItem('cx_token');
  if (!token) return;
  try {
    const res = await fetch(_getBase() + '/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token },
      signal: AbortSignal.timeout(3000)
    });
    const data = await res.json();
    if (data.success) {
      window._currentUser = data.user;
      localStorage.setItem('cx_user', JSON.stringify(data.user));
    } else {
      // Token expired
      localStorage.removeItem('cx_token');
      localStorage.removeItem('cx_user');
      window._currentUser = null;
    }
  } catch(e) {
    // Backend unreachable — use cached user
    const cached = localStorage.getItem('cx_user');
    if (cached) {
      try { window._currentUser = JSON.parse(cached); } catch(e2) {}
    }
  }
}

// ============ LOGIN ============
async function authLogin(email, password) {
  // Try backend
  try {
    const res = await fetch(_getBase() + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('cx_token', data.token);
      localStorage.setItem('cx_user', JSON.stringify(data.user));
      window._currentUser = data.user;
    }
    return data;
  } catch(e) {
    // Backend unavailable — fallback to localStorage
    return _localLogin(email, password);
  }
}

function _localLogin(email, password) {
  const users = JSON.parse(localStorage.getItem('cx_users') || '[]');
  const user  = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { success: false, message: 'Account not found.' };
  if (user.password !== password) return { success: false, message: 'Incorrect password.' };
  if (user.status === 'suspended') return { success: false, message: 'Account suspended.' };
  user.lastLogin = Date.now();
  localStorage.setItem('cx_session', user.id);
  localStorage.setItem('cx_user', JSON.stringify(user));
  window._currentUser = user;
  return { success: true, user };
}

// ============ REGISTER ============
async function authRegister(name, email, password, phone) {
  try {
    const res = await fetch(_getBase() + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('cx_token', data.token);
      localStorage.setItem('cx_user', JSON.stringify(data.user));
      window._currentUser = data.user;
    }
    return data;
  } catch(e) {
    return _localRegister(name, email, password, phone);
  }
}

function _localRegister(name, email, password, phone) {
  const users = JSON.parse(localStorage.getItem('cx_users') || '[]');
  if (!users.find(u => u.email)) {
    // Seed admin if empty
    users.push({ id:'UID000001', name:'Admin CryptoX', email:'admin@cryptox.io', password:'Admin@123456', role:'admin', status:'active', kyc_status:'verified', createdAt: Date.now(), referral_code:'ADMIN01' });
  }
  if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase()))
    return { success: false, message: 'Email already registered.' };
  const newUser = {
    id: 'UID' + Date.now(), name, email, phone: phone || '', password,
    role: 'user', status: 'active', kyc_status: 'unverified',
    createdAt: Date.now(), lastLogin: Date.now(),
    referral_code: Date.now().toString().slice(-6).toUpperCase()
  };
  users.push(newUser);
  localStorage.setItem('cx_users', JSON.stringify(users));
  localStorage.setItem('cx_session', newUser.id);
  localStorage.setItem('cx_user', JSON.stringify(newUser));
  window._currentUser = newUser;
  return { success: true, user: newUser };
}

// ============ LOGOUT ============
function authLogout() {
  // Backend logout (fire and forget)
  const token = localStorage.getItem('cx_token');
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    }).catch(() => {});
  }
  // Clear semua data session
  localStorage.removeItem('cx_token');
  localStorage.removeItem('cx_user');
  localStorage.removeItem('cx_session');
  window._currentUser = null;
  // Redirect ke index
  const path = window.location.pathname;
  if (path.includes('/admin/')) {
    window.location.href = '../index.html';
  } else {
    window.location.href = '/index.html';
  }
}

// ============ GUARD FUNCTIONS ============
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

function requireAdmin() {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '../login.html';
    return null;
  }
  return user;
}

// ============ SAVE USER HELPERS (local) ============
function getUsers() { return JSON.parse(localStorage.getItem('cx_users') || '[]'); }
function saveUsers(u) { localStorage.setItem('cx_users', JSON.stringify(u)); }
function saveCurrentUser(user) {
  window._currentUser = user;
  localStorage.setItem('cx_user', JSON.stringify(user));
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) { users[idx] = user; saveUsers(users); }
}

// ============ NAV UPDATE ============
function updateNavAuth() {
  const user = getCurrentUser();
  const el   = document.getElementById('navAuth');
  if (!el || !user) return;
  const isAdmin = window.location.pathname.includes('/admin/');
  const base    = isAdmin ? '../' : '';
  el.innerHTML = `
    <a href="${base}dashboard.html" class="btn btn-dark btn-sm">Dashboard</a>
    <div class="user-nav">
      <div class="avatar">${(user.name||'U').slice(0,2).toUpperCase()}</div>
      <i class="fas fa-chevron-down" style="font-size:9px;color:var(--t3)"></i>
      <div class="dropdown">
        <div class="drop-item" onclick="location.href='${base}dashboard.html'"><i class="fas fa-home"></i> Dashboard</div>
        <div class="drop-item" onclick="location.href='${base}wallet.html'"><i class="fas fa-wallet"></i> Assets</div>
        <div class="drop-item" onclick="location.href='${base}profile.html'"><i class="fas fa-user-cog"></i> Profile</div>
        ${user.role==='admin'?`<div class="drop-item" onclick="location.href='${base}admin/dashboard.html'"><i class="fas fa-cog"></i> Admin</div>`:''}
        <div class="drop-divider"></div>
        <div class="drop-item" style="color:var(--red)" onclick="authLogout()"><i class="fas fa-sign-out-alt"></i> Logout</div>
      </div>
    </div>`;
}

// ============ TOAST ============
function showToast(message, type = 't-info') {
  let t = document.getElementById('_toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_toast';
    t.className = 'toast';
    t.innerHTML = '<span class="toast-msg"></span>';
    document.body.appendChild(t);
  }
  t.querySelector('.toast-msg').textContent = message;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ============ DEFAULT BALANCES ============
function getDefaultBalances() {
  return {
    USDT: { available: 10000, in_order: 0 },
    BTC:  { available: 0, in_order: 0 },
    ETH:  { available: 0, in_order: 0 },
    BNB:  { available: 0, in_order: 0 },
    SOL:  { available: 0, in_order: 0 },
    XRP:  { available: 0, in_order: 0 },
  };
}

// ============ AUTO-INIT ============
// Run initAuthOnLoad on every page (refresh user data in background)
document.addEventListener('DOMContentLoaded', () => {
  initAuthOnLoad().then(() => {
    updateNavAuth();
    // Update avatar/name elements if present
    const user = getCurrentUser();
    if (user) {
      const av = document.getElementById('navAv');
      if (av) av.textContent = (user.name||'U').slice(0,2).toUpperCase();
      const wn = document.getElementById('welcomeName') || document.getElementById('adminName');
      if (wn) wn.textContent = (user.name||'User').split(' ')[0];
    }
    // Logout buttons
    document.querySelectorAll('[data-logout]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); authLogout(); });
    });
  });
});
