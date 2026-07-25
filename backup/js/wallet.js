// ============================================
// CRYPTOX — WALLET PAGE JS (Updated)
// ============================================
const COIN_COLORS_W={BTC:'#F7931A',ETH:'#627EEA',BNB:'#F0B90B',SOL:'#9945FF',XRP:'#00AAE4',ADA:'#3CCAB0',AVAX:'#E84142',DOGE:'#C2A633',USDT:'#26A17B',DOT:'#E6007A',MATIC:'#8247E5',LINK:'#2A5ADA',TRX:'#FF0013',NEAR:'#00C1DE',ARB:'#28A0F0'};

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthOnLoad();
  const user = requireAuth(); if (!user) return;
  const av = document.getElementById('navAv');
  if (av) av.textContent = (user.name||'U').slice(0,2).toUpperCase();
  await loadWalletBalances(user);
  await loadTransactionHistory('all');
  // Tx tabs
  document.querySelectorAll('.tx-tab').forEach(t => {
    t.addEventListener('click', function() {
      document.querySelectorAll('.tx-tab').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadTransactionHistory(this.dataset.tx);
    });
  });
});

async function loadWalletBalances(user) {
  let balances = {};
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/wallet/balances', { headers: {'Authorization':'Bearer '+token} });
      const data = await res.json();
      if (data.success) balances = data.balances;
    }
  } catch(e) {}
  if (!Object.keys(balances).length) balances = getDefaultBalances();

  let totalUSD = 0;
  const rows = [];
  Object.entries(balances).forEach(([coin, b]) => {
    const c = COINS.find(x => x.id === coin);
    const price = coin === 'USDT' ? 1 : (c ? c.price : 0);
    const total = (b.available || 0) + (b.in_order || 0);
    const usdVal = total * price;
    totalUSD += usdVal;
    rows.push({ coin, available: b.available || 0, in_order: b.in_order || 0, total, price, usdVal, change: c ? c.change : 0 });
  });
  rows.sort((a, b) => b.usdVal - a.usdVal);

  const btcPrice = COINS.find(c => c.id === 'BTC')?.price || 67000;
  const totalBTC = totalUSD / btcPrice;
  const hide = document.getElementById('hideIcon')?.className?.includes('slash') || false;

  const wt = document.getElementById('walletTotal');
  const we = document.getElementById('walletBtcEq');
  if (wt) wt.textContent = '$' + totalUSD.toFixed(2);
  if (we) we.textContent = '≈ ' + totalBTC.toFixed(8) + ' BTC';

  const tbody = document.getElementById('walletTbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div style="width:32px;height:32px;border-radius:50%;background:${COIN_COLORS_W[r.coin]||'#888'}22;color:${COIN_COLORS_W[r.coin]||'#888'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0">${r.coin.slice(0,3)}</div>
        <div><div style="font-weight:700">${r.coin}</div><div style="font-size:11px;color:var(--t3)">${COINS.find(c=>c.id===r.coin)?.name||r.coin}</div></div>
      </div></td>
      <td style="text-align:right;font-weight:600">${r.coin==='USDT'?r.total.toFixed(2):r.total.toFixed(6)}</td>
      <td style="text-align:right">${r.coin==='USDT'?r.available.toFixed(2):r.available.toFixed(6)}</td>
      <td style="text-align:right;color:var(--t3)">${r.in_order>0?r.in_order.toFixed(6):'-'}</td>
      <td style="text-align:right">$${r.price>100?r.price.toFixed(2):r.price.toFixed(6)}</td>
      <td style="text-align:right;font-weight:600">$${r.usdVal.toFixed(2)}</td>
      <td style="text-align:right" class="${r.change>=0?'positive':'negative'}">${r.change>=0?'+':''}${r.change.toFixed(2)}%</td>
      <td>
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <a href="deposit.html?coin=${r.coin}" class="btn btn-dark btn-xs">Deposit</a>
          <a href="withdraw.html?coin=${r.coin}" class="btn btn-dark btn-xs">Withdraw</a>
          ${r.coin!=='USDT'?`<a href="trade.html?pair=${r.coin}USDT" class="btn btn-ghost btn-xs">Trade</a>`:''}
        </div>
      </td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--t3)">No assets found</td></tr>';
}

async function loadTransactionHistory(type) {
  const tbody = document.getElementById('txTbody'); if (!tbody) return;
  let txns = [];
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/wallet/transactions?limit=50', { headers: {'Authorization':'Bearer '+token} });
      const data = await res.json();
      if (data.success) txns = data.transactions || [];
    }
  } catch(e) {}
  const filtered = type === 'all' ? txns : txns.filter(t => t.type === type);
  tbody.innerHTML = filtered.length ? filtered.slice(0,30).map(t => `
    <tr>
      <td style="font-size:11px;color:var(--t3)">${new Date(t.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
      <td><span class="status-pill ${t.type==='deposit'?'sp-confirmed':t.type==='withdrawal'?'sp-pending':'sp-filled'}" style="font-size:10px">${t.type}</span></td>
      <td><strong>${t.coin||'--'}</strong></td>
      <td style="text-align:right;font-weight:600">${t.amount?.toFixed?.(6)||t.amount}</td>
      <td><span class="status-pill sp-${t.status==='completed'||t.status==='filled'||t.status==='confirmed'?'filled':t.status==='pending'?'pending':'cancelled'}">${t.status||'--'}</span></td>
      <td style="font-size:11px;color:var(--t3)">${t.id?t.id.slice(0,18)+'...':'-'}</td>
    </tr>`) .join('') : '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--t3)">No transactions found</td></tr>';
}

function toggleHide() {
  const icon = document.getElementById('hideIcon');
  const hiding = !icon.className.includes('slash');
  icon.className = hiding ? 'fas fa-eye-slash' : 'fas fa-eye';
  const user = getCurrentUser();
  if (user) loadWalletBalances(user);
}

function filterCoins() {
  const search = document.getElementById('coinSearch')?.value?.toLowerCase() || '';
  const hideZ  = document.getElementById('hideZero')?.checked || false;
  document.querySelectorAll('#walletTbody tr').forEach(tr => {
    const coin = tr.querySelector('strong')?.textContent?.toLowerCase() || '';
    const val  = parseFloat(tr.querySelector('td:nth-child(2)')?.textContent || '0');
    const matchSearch = !search || coin.includes(search);
    const matchHide   = !hideZ || val > 0;
    tr.style.display = (matchSearch && matchHide) ? '' : 'none';
  });
}

function showToast(msg, type='t-info') {
  const c = document.getElementById('toastContainer'); if (!c) return;
  const icons = {'t-ok':'fas fa-check-circle','t-err':'fas fa-times-circle','t-warn':'fas fa-exclamation-triangle','t-info':'fas fa-info-circle'};
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<i class="toast-icon ${icons[type]||'fas fa-info-circle'}"></i><span class="toast-msg">${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}
window.showToast = showToast;
