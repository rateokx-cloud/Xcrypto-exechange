// ============================================
// CRYPTOX - API CLIENT (connects to backend)
// ============================================

const API_BASE = window.location.origin + '/api';
const WS_URL   = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws';

// ============ HTTP CLIENT ============
class ApiClient {
  constructor() {
    this.token = localStorage.getItem('cx_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('cx_token', token);
    else localStorage.removeItem('cx_token');
  }

  getHeaders(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return h;
  }

  async get(path, params = {}) {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params) : '';
    const res = await fetch(API_BASE + path + qs, { headers: this.getHeaders() });
    return res.json();
  }

  async post(path, body = {}) {
    const res = await fetch(API_BASE + path, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return res.json();
  }

  async put(path, body = {}) {
    const res = await fetch(API_BASE + path, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(body)
    });
    return res.json();
  }

  async delete(path) {
    const res = await fetch(API_BASE + path, { method: 'DELETE', headers: this.getHeaders() });
    return res.json();
  }

  // AUTH
  async login(email, password)      { return this.post('/auth/login', { email, password }); }
  async register(data)              { return this.post('/auth/register', data); }
  async me()                        { return this.get('/auth/me'); }
  async updateProfile(data)         { return this.put('/auth/profile', data); }
  async changePassword(o, n)        { return this.put('/auth/change-password', { old_password:o, new_password:n }); }
  async logout()                    { return this.post('/auth/logout'); }

  // WALLET
  async getBalances()               { return this.get('/wallet/balances'); }
  async getDepositAddress(c, net)   { return this.post('/wallet/deposit/address', { coin:c, network:net }); }
  async getDeposits(p = {})         { return this.get('/wallet/deposits', p); }
  async withdraw(data)              { return this.post('/wallet/withdraw', data); }
  async getWithdrawals(p = {})      { return this.get('/wallet/withdrawals', p); }
  async getTransactions(p = {})     { return this.get('/wallet/transactions', p); }

  // TRADING
  async getMarkets()                { return this.get('/trading/markets'); }
  async getTickers()                { return this.get('/trading/ticker'); }
  async getTicker(pair)             { return this.get('/trading/ticker/' + pair.replace('/','-')); }
  async getOrderBook(pair, lvl=15)  { return this.get('/trading/orderbook/' + pair.replace('/','-'), { levels:lvl }); }
  async getRecentTrades(pair, n=30) { return this.get('/trading/trades/' + pair.replace('/','-'), { limit:n }); }
  async getKlines(pair, i, n=200)   { return this.get('/trading/klines/' + pair.replace('/','-'), { interval:i, limit:n }); }
  async placeOrder(data)            { return this.post('/trading/order', data); }
  async cancelOrder(id)             { return this.delete('/trading/order/' + id); }
  async getOrders(p = {})           { return this.get('/trading/orders', p); }
  async getMyTrades(p = {})         { return this.get('/trading/my-trades', p); }

  // USERS
  async getNotifications()          { return this.get('/users/notifications'); }
  async markAllRead()               { return this.put('/users/notifications/read-all'); }
  async getReferrals()              { return this.get('/users/referrals'); }
  async submitKYC(data)             { return this.post('/users/kyc', data); }
  async getKYCStatus()              { return this.get('/users/kyc'); }
  async getApiKeys()                { return this.get('/users/api-keys'); }
  async createApiKey(label, perms)  { return this.post('/users/api-keys', { label, permissions:perms }); }
  async deleteApiKey(id)            { return this.delete('/users/api-keys/' + id); }

  // ADMIN
  async adminDashboard()            { return this.get('/admin/dashboard'); }
  async adminUsers(p = {})          { return this.get('/users/admin/list', p); }
  async adminUserDetail(id)         { return this.get('/users/admin/' + id); }
  async adminUpdateUserStatus(id,s) { return this.put('/users/admin/' + id + '/status', { status:s }); }
  async adminUpdateKYC(id, data)    { return this.put('/users/admin/' + id + '/kyc', data); }
  async adminCreditBalance(data)    { return this.post('/wallet/admin/credit', data); }
  async adminGetWithdrawals(s='all'){ return this.get('/wallet/admin/withdrawals', { status:s }); }
  async adminApproveWd(id, note)    { return this.put('/wallet/admin/withdrawals/' + id, { status:'approved', admin_note:note }); }
  async adminRejectWd(id, note)     { return this.put('/wallet/admin/withdrawals/' + id, { status:'rejected', admin_note:note }); }
  async adminGetOrders(p={})        { return this.get('/trading/admin/orders', p); }
  async adminGetMarkets()           { return this.get('/trading/markets'); }
  async adminUpdateMarket(id,data)  { return this.put('/trading/admin/markets/' + id, data); }
  async adminCreateMarket(data)     { return this.post('/trading/admin/markets', data); }
  async adminGetAnnouncements()     { return this.get('/admin/announcements'); }
  async adminCreateAnn(data)        { return this.post('/admin/announcements', data); }
  async adminToggleAnn(id, active)  { return this.put('/admin/announcements/' + id, { is_active: active }); }
  async adminDeleteAnn(id)          { return this.delete('/admin/announcements/' + id); }
  async adminKycPending()           { return this.get('/users/admin/kyc/pending'); }
  async adminAuditLogs(p={})        { return this.get('/admin/audit-logs', p); }
  async adminStats()                { return this.get('/users/admin/stats'); }
  async adminTradingStats()         { return this.get('/trading/admin/stats'); }
}

const api = new ApiClient();

// ============ WEBSOCKET CLIENT ============
class CryptoWebSocket {
  constructor() {
    this.ws = null;
    this.handlers = {}; // type -> [callbacks]
    this.subscriptions = new Set();
    this.reconnectDelay = 2000;
    this.maxReconnect  = 10;
    this.reconnectCount = 0;
    this.connected = false;
  }

  connect() {
    if (this.ws && this.ws.readyState <= 1) return;
    try {
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen    = () => this._onOpen();
      this.ws.onmessage = (e) => this._onMessage(e);
      this.ws.onclose   = () => this._onClose();
      this.ws.onerror   = (e) => console.warn('WS error:', e);
    } catch (err) {
      console.warn('WebSocket unavailable, using polling mode');
      this._startPolling();
    }
  }

  _onOpen() {
    this.connected = true;
    this.reconnectCount = 0;
    console.log('✅ WebSocket connected');
    // Re-subscribe all pairs
    if (this.subscriptions.size > 0) {
      this.ws.send(JSON.stringify({ type: 'subscribe', pairs: Array.from(this.subscriptions) }));
    }
    this._emit('connected', {});
  }

  _onMessage(e) {
    try {
      const msg = JSON.parse(e.data);
      this._emit(msg.type, msg);
    } catch {}
  }

  _onClose() {
    this.connected = false;
    this._emit('disconnected', {});
    if (this.reconnectCount < this.maxReconnect) {
      this.reconnectCount++;
      setTimeout(() => this.connect(), this.reconnectDelay * Math.min(this.reconnectCount, 5));
    } else {
      this._startPolling();
    }
  }

  _startPolling() {
    // Fallback: poll REST API every 2s
    console.log('Using REST polling fallback');
    setInterval(async () => {
      try {
        const data = await api.getTickers();
        if (data.success) {
          const prices = {};
          data.tickers.forEach(t => { prices[t.pair] = t; });
          this._emit('tickers', { type: 'tickers', data: prices });
        }
      } catch {}
    }, 2000);
  }

  subscribe(pairs) {
    const arr = Array.isArray(pairs) ? pairs : [pairs];
    arr.forEach(p => this.subscriptions.add(p.toUpperCase().replace('-','/')));
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'subscribe', pairs: arr }));
    }
  }

  unsubscribe(pairs) {
    const arr = Array.isArray(pairs) ? pairs : [pairs];
    arr.forEach(p => this.subscriptions.delete(p.toUpperCase().replace('-','/')));
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', pairs: arr }));
    }
  }

  on(type, callback) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(callback);
    return () => this.off(type, callback); // returns unsubscribe fn
  }

  off(type, callback) {
    if (this.handlers[type]) {
      this.handlers[type] = this.handlers[type].filter(cb => cb !== callback);
    }
  }

  _emit(type, data) {
    (this.handlers[type] || []).forEach(cb => { try { cb(data); } catch {} });
    (this.handlers['*'] || []).forEach(cb => { try { cb(type, data); } catch {} });
  }

  send(data) {
    if (this.connected && this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) { this.ws.close(); this.ws = null; }
  }
}

const cryptoWS = new CryptoWebSocket();

// ============ AUTH STATE ============
async function initAuth() {
  const token = localStorage.getItem('cx_token');
  if (!token) return null;
  api.setToken(token);
  try {
    const res = await api.me();
    if (res.success) {
      window._currentUser = res.user;
      return res.user;
    } else {
      api.setToken(null);
      return null;
    }
  } catch {
    return null;
  }
}

function getCurrentUser() {
  return window._currentUser || null;
}

async function apiLogin(email, password) {
  const res = await api.login(email, password);
  if (res.success) {
    api.setToken(res.token);
    window._currentUser = res.user;
  }
  return res;
}

async function apiRegister(data) {
  const res = await api.register(data);
  if (res.success) {
    api.setToken(res.token);
    window._currentUser = res.user;
  }
  return res;
}

async function apiLogout() {
  try { await api.logout(); } catch {}
  api.setToken(null);
  window._currentUser = null;
  const isAdmin = window.location.pathname.includes('/admin/');
  window.location.href = isAdmin ? '../index.html' : '/index.html';
}

function requireAuthAPI() {
  const user = getCurrentUser();
  if (!user) { window.location.href = '/login.html'; return null; }
  return user;
}

function requireAdminAPI() {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') { window.location.href = '/login.html'; return null; }
  return user;
}
