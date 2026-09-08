// ============================================
// CRYPTOX — WALLET PAGE JS
// ============================================
const COIN_COLORS_W = {
  BTC:'#F7931A', ETH:'#627EEA', BNB:'#F0B90B', SOL:'#9945FF',
  XRP:'#00AAE4', ADA:'#3CCAB0', AVAX:'#E84142', DOGE:'#C2A633',
  USDT:'#26A17B', DOT:'#E6007A', MATIC:'#8247E5', LINK:'#2A5ADA',
  TRX:'#FF0013', NEAR:'#00C1DE', ARB:'#28A0F0'
};

// ── Currency State ────────────────────────────────────────────────────────
let activeCurrency = 'USD';
let totalUSD_global = 0;
const IDR_RATE = 16250;

function getBtcPrice() { return COINS.find(c => c.id === 'BTC')?.price || 67000; }
function getEthPrice() { return COINS.find(c => c.id === 'ETH')?.price || 3840; }

// Format numbers without B/M shortcuts (proper IDR, proper crypto)
function fmtUSD(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtIDR(n) {
  // Indonesian format: 1.234.567,00
  return n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Convert a USD amount to active currency string (for main balance display)
function convertUSD(usd) {
  switch (activeCurrency) {
    case 'IDR': return 'Rp\u00a0' + fmtIDR(usd * IDR_RATE);
    case 'BTC': return '\u20bf\u00a0' + (usd / getBtcPrice()).toFixed(8);
    case 'ETH': return '\u039e\u00a0' + (usd / getEthPrice()).toFixed(6);
    default:    return '$' + fmtUSD(usd);
  }
}

// Shorter format for table cells
function convertUSDShort(usd) {
  switch (activeCurrency) {
    case 'IDR': return 'Rp\u00a0' + fmtIDR(usd * IDR_RATE);
    case 'BTC': return '\u20bf\u00a0' + (usd / getBtcPrice()).toFixed(6);
    case 'ETH': return '\u039e\u00a0' + (usd / getEthPrice()).toFixed(5);
    default:    return '$' + fmtUSD(usd);
  }
}

// Currency label for the unit badge (no duplication)
function getCurrencyLabel() {
  return activeCurrency; // always show code in the small unit span
}

// ── Render Total Balance ──────────────────────────────────────────────────
function renderTotalBalance(totalUSD) {
  totalUSD_global = totalUSD;

  const elTotal = document.getElementById('walletTotal');
  const elUnit  = document.getElementById('walletUnit');
  const elSub   = document.getElementById('walletBtcEq');
  const elHdr   = document.getElementById('valueColHead');

  if (elTotal) elTotal.textContent = convertUSD(totalUSD);
  if (elUnit)  elUnit.textContent  = getCurrencyLabel();
  if (elHdr)   elHdr.textContent   = activeCurrency + ' Value';

  // Sub-line: always show BTC + ETH equiv (except when viewing that currency)
  if (elSub) {
    const btcEq = (totalUSD / getBtcPrice()).toFixed(8);
    const ethEq = (totalUSD / getEthPrice()).toFixed(6);
    const idrEq = 'Rp\u00a0' + fmtIDR(totalUSD * IDR_RATE);

    if (activeCurrency === 'BTC')
      elSub.textContent = '\u2248 ' + ethEq + ' ETH  \u2022  ' + idrEq;
    else if (activeCurrency === 'ETH')
      elSub.textContent = '\u2248 ' + btcEq + ' BTC  \u2022  ' + idrEq;
    else if (activeCurrency === 'IDR')
      elSub.textContent = '\u2248 ' + btcEq + ' BTC  \u2022  ' + ethEq + ' ETH';
    else
      elSub.textContent = '\u2248 ' + btcEq + ' BTC  \u2022  ' + ethEq + ' ETH';
  }

  updateRateDisplay();
}

// ── Update rate labels inside the dropdown ────────────────────────────────
function updateRateDisplay() {
  const el = id => document.getElementById(id);
  if (el('rate-USD')) el('rate-USD').textContent = '1.00';
  if (el('rate-IDR')) el('rate-IDR').textContent = fmtIDR(IDR_RATE) + ' / $1';
  if (el('rate-BTC')) el('rate-BTC').textContent = '~ $' + getBtcPrice().toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0});
  if (el('rate-ETH')) el('rate-ETH').textContent = '~ $' + getEthPrice().toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0});
  // Highlight active item
  document.querySelectorAll('.cur-drop-item').forEach(item => {
    item.classList.toggle('active', item.dataset.cur === activeCurrency);
  });
  // Update button flag icon & label (class-based, no emoji)
  const flagEl = document.getElementById('curSelFlag');
  const lblEl  = document.getElementById('curSelLabel');
  if (flagEl) {
    flagEl.className = 'cur-flag-icon cur-flag-' + activeCurrency.toLowerCase();
  }
  if (lblEl) lblEl.textContent = activeCurrency;
}

// ── Dropdown Handlers ─────────────────────────────────────────────────────
function toggleCurrencyDrop(e) {
  e.stopPropagation();
  const drop  = document.getElementById('curDrop');
  const arrow = document.getElementById('curSelArrow');
  if (!drop) return;
  const isOpen = drop.classList.toggle('open');
  if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : '';
}

function selectCurrency(el) {
  activeCurrency = el.dataset.cur;
  // Close dropdown
  const drop  = document.getElementById('curDrop');
  const arrow = document.getElementById('curSelArrow');
  if (drop)  drop.classList.remove('open');
  if (arrow) arrow.style.transform = '';
  // Re-render
  renderTotalBalance(totalUSD_global);
  const user = getCurrentUser();
  if (user) loadWalletBalances(user);
}

// Close on outside click
document.addEventListener('click', e => {
  const selector = document.getElementById('currencySelector');
  if (selector && !selector.contains(e.target)) {
    const drop  = document.getElementById('curDrop');
    const arrow = document.getElementById('curSelArrow');
    if (drop)  drop.classList.remove('open');
    if (arrow) arrow.style.transform = '';
  }
});

// ── Page Init ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await initAuthOnLoad();
  const user = requireAuth();
  if (!user) return;

  const av = document.getElementById('navAv');
  if (av) av.textContent = (user.name || 'U').slice(0, 2).toUpperCase();

  updateRateDisplay();
  await loadWalletBalances(user);
  await loadTransactionHistory('all');

  document.querySelectorAll('.tx-tab').forEach(t => {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tx-tab').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadTransactionHistory(this.dataset.tx);
    });
  });
});

// ── Load & Render Wallet Balances ─────────────────────────────────────────
async function loadWalletBalances(user) {
  let balances = {};
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/wallet/balances', { headers: { 'Authorization': 'Bearer ' + token } });
      const data = await res.json();
      if (data.success) balances = data.balances;
    }
  } catch (e) {}

  if (!Object.keys(balances).length) balances = getDefaultBalances();

  let totalUSD = 0;
  const rows = [];

  Object.entries(balances).forEach(([coin, b]) => {
    const coinData = COINS.find(x => x.id === coin);
    const price    = coin === 'USDT' ? 1 : (coinData ? coinData.price : 0);
    const total    = (b.available || 0) + (b.in_order || 0);
    const usdVal   = total * price;
    totalUSD += usdVal;
    rows.push({
      coin,
      available: b.available || 0,
      in_order:  b.in_order  || 0,
      total, price, usdVal,
      change: coinData ? coinData.change : 0,
      name:   coinData ? coinData.name : coin
    });
  });

  rows.sort((a, b) => b.usdVal - a.usdVal);
  renderTotalBalance(totalUSD);

  const tbody = document.getElementById('walletTbody');
  if (!tbody) return;

  tbody.innerHTML = rows.map(r => {
    const color = COIN_COLORS_W[r.coin] || '#888';
    const fmt   = r.coin === 'USDT' ? v => v.toFixed(2) : v => v.toFixed(6);
    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:50%;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0">${r.coin.slice(0,3)}</div>
          <div>
            <div style="font-weight:700;color:var(--t1)">${r.coin}</div>
            <div style="font-size:11px;color:var(--t3)">${r.name}</div>
          </div>
        </div>
      </td>
      <td style="text-align:right;font-weight:600;color:var(--t1)">${fmt(r.total)}</td>
      <td style="text-align:right;color:var(--t2)">${fmt(r.available)}</td>
      <td style="text-align:right;color:var(--t3)">${r.in_order > 0 ? r.in_order.toFixed(6) : '—'}</td>
      <td style="text-align:right;color:var(--t2)">$${r.price > 100 ? r.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : r.price.toFixed(r.price > 1 ? 4 : 6)}</td>
      <td style="text-align:right;font-weight:600;color:var(--t1)">${convertUSDShort(r.usdVal)}</td>
      <td style="text-align:right" class="${r.change >= 0 ? 'positive' : 'negative'}">${r.change >= 0 ? '+' : ''}${r.change.toFixed(2)}%</td>
      <td>
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <a href="deposit.html?coin=${r.coin}" class="btn btn-dark btn-xs">Deposit</a>
          <a href="withdraw.html?coin=${r.coin}" class="btn btn-dark btn-xs">Withdraw</a>
          ${r.coin !== 'USDT' ? `<a href="trade.html?pair=${r.coin}USDT" class="btn btn-ghost btn-xs">Trade</a>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--t3)"><i class="fas fa-wallet" style="font-size:24px;margin-bottom:8px;display:block"></i>No assets found</td></tr>';
}

// ── Transaction History ───────────────────────────────────────────────────
async function loadTransactionHistory(type) {
  const tbody = document.getElementById('txTbody');
  if (!tbody) return;

  let txns = [];
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/wallet/transactions?limit=50', { headers: { 'Authorization': 'Bearer ' + token } });
      const data = await res.json();
      if (data.success) txns = data.transactions || [];
    }
  } catch (e) {}

  const filtered = type === 'all' ? txns : txns.filter(t => t.type === type);

  tbody.innerHTML = filtered.length
    ? filtered.slice(0, 30).map(t => {
        const dateStr = new Date(t.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
        const typeClass = t.type === 'deposit' ? 'sp-confirmed' : t.type === 'withdrawal' ? 'sp-pending' : 'sp-filled';
        const stClass   = ['completed','filled','confirmed'].includes(t.status) ? 'sp-filled' : t.status === 'pending' ? 'sp-pending' : 'sp-cancelled';
        return `
        <tr>
          <td style="font-size:11px;color:var(--t3);white-space:nowrap">${dateStr}</td>
          <td><span class="status-pill ${typeClass}" style="font-size:10px;text-transform:capitalize">${t.type}</span></td>
          <td><strong>${t.coin || '—'}</strong></td>
          <td style="text-align:right;font-weight:600">${parseFloat(t.amount || 0).toFixed(6)}</td>
          <td><span class="status-pill ${stClass}" style="text-transform:capitalize">${t.status || '—'}</span></td>
          <td style="font-size:11px;color:var(--t3);font-family:monospace">${t.id ? t.id.slice(0, 16) + '…' : '—'}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--t3)"><i class="fas fa-clock" style="font-size:22px;margin-bottom:8px;display:block"></i>No transactions found</td></tr>';
}

// ── Toggle Balance Visibility ─────────────────────────────────────────────
function toggleHide() {
  const icon   = document.getElementById('hideIcon');
  const hidden = icon.classList.contains('fa-eye-slash');
  icon.classList.toggle('fa-eye',     hidden);
  icon.classList.toggle('fa-eye-slash', !hidden);
  const user = getCurrentUser();
  if (user) loadWalletBalances(user);
}

// ── Filter Coin Table ─────────────────────────────────────────────────────
function filterCoins() {
  const search = (document.getElementById('coinSearch')?.value || '').toLowerCase();
  const hideZ  = document.getElementById('hideZero')?.checked || false;

  document.querySelectorAll('#walletTbody tr').forEach(tr => {
    const coinCell = tr.querySelector('td:first-child');
    if (!coinCell) return;
    const coinText = coinCell.textContent.toLowerCase();
    const totalVal = parseFloat(tr.querySelector('td:nth-child(2)')?.textContent || '0');
    const matchSearch = !search || coinText.includes(search);
    const matchHide   = !hideZ  || totalVal > 0;
    tr.style.display  = (matchSearch && matchHide) ? '' : 'none';
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, type = 't-info') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const icons = { 't-ok':'fas fa-check-circle', 't-err':'fas fa-times-circle', 't-warn':'fas fa-exclamation-triangle', 't-info':'fas fa-info-circle' };
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<i class="toast-icon ${icons[type] || 'fas fa-info-circle'}"></i><span class="toast-msg">${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}
window.showToast = showToast;
