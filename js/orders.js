// ============================================
// CRYPTOX — ORDERS PAGE JS
// ============================================
let allOrders = [];
let currentTab = 'open';
let currentPage = 1;
const PAGE_SIZE = 20;

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthOnLoad();
  const user = requireAuth(); if (!user) return;
  const av = document.getElementById('navAv');
  if (av) av.textContent = (user.name||'U').slice(0,2).toUpperCase();
  await loadOrders();
});

async function loadOrders() {
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/trading/orders?limit=200', { headers: { 'Authorization': 'Bearer ' + token } });
      const data = await res.json();
      if (data.success) { allOrders = data.orders || []; renderStats(); renderTable(); return; }
    }
  } catch(e) {}
  // Fallback to localStorage
  const user = getCurrentUser();
  allOrders = JSON.parse(localStorage.getItem('cx_orders_' + (user?.id||'')) || '[]').reverse();
  renderStats();
  renderTable();
}

function renderStats() {
  const total     = allOrders.length;
  const filled    = allOrders.filter(o => o.status === 'filled').length;
  const open      = allOrders.filter(o => o.status === 'open').length;
  const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
  const el = id => document.getElementById(id);
  if(el('statTotal'))     el('statTotal').textContent     = total;
  if(el('statFilled'))    el('statFilled').textContent    = filled;
  if(el('statOpen'))      el('statOpen').textContent      = open;
  if(el('statCancelled')) el('statCancelled').textContent = cancelled;
  if(el('openCnt'))       el('openCnt').textContent       = open;
}

function renderTable() {
  const pair   = document.getElementById('fPair')?.value || '';
  const side   = document.getElementById('fSide')?.value || '';
  const status = document.getElementById('fStatus')?.value || '';
  const from   = document.getElementById('fFrom')?.value;
  const to     = document.getElementById('fTo')?.value;

  let list = [...allOrders];
  if (currentTab === 'open')    list = list.filter(o => o.status === 'open');
  if (currentTab === 'history') list = list.filter(o => o.status !== 'open');
  if (pair)   list = list.filter(o => (o.pair||'').includes(pair));
  if (side)   list = list.filter(o => o.side === side);
  if (status) list = list.filter(o => o.status === status);
  if (from)   list = list.filter(o => (o.created_at || o.time) >= new Date(from).getTime());
  if (to)     list = list.filter(o => (o.created_at || o.time) <= new Date(to).getTime() + 86400000);

  list.sort((a, b) => (b.created_at||b.time||0) - (a.created_at||a.time||0));

  const total = list.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const paged = list.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE);

  const tbody = document.getElementById('ordersTbody');
  if (!tbody) return;

  tbody.innerHTML = paged.length ? paged.map(o => {
    const ts  = o.created_at || o.time || 0;
    const dt  = new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    const id  = (o.id||'').slice(0,14) + '...';
    const pr  = parseFloat(o.price||0).toFixed(o.price>100?2:6);
    const amt = parseFloat(o.amount||0).toFixed(6);
    const tot = parseFloat(o.total||0).toFixed(2);
    const fil = o.status==='filled'?amt:'0.000000';
    return `<tr>
      <td style="font-size:11px;color:var(--t3);font-family:monospace">${id}</td>
      <td style="font-size:11px;color:var(--t3)">${dt}</td>
      <td><strong>${o.pair||'-'}</strong></td>
      <td style="text-transform:capitalize;color:var(--t2)">${o.type||'limit'}</td>
      <td class="${o.side==='buy'?'positive':'negative'}" style="font-weight:700;text-transform:uppercase">${o.side||'-'}</td>
      <td style="text-align:right;font-weight:600">$${pr}</td>
      <td style="text-align:right">${amt}</td>
      <td style="text-align:right;color:var(--t2)">${fil}</td>
      <td style="text-align:right;font-weight:600">$${tot}</td>
      <td><span class="status-pill sp-${o.status==='filled'?'filled':o.status==='open'?'open':'cancelled'}">${o.status||'-'}</span></td>
      <td>${o.status==='open' ? `<button class="btn btn-dark btn-xs" onclick="cancelOrder('${o.id||o._id}')"><i class="fas fa-times"></i> Cancel</button>` : '-'}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--t3)"><i class="fas fa-receipt" style="font-size:28px;display:block;margin-bottom:10px;opacity:.3"></i>No orders found</td></tr>`;

  // Pagination
  const pi = document.getElementById('pageInfo');
  if (pi) pi.textContent = `Showing ${paged.length} of ${total} orders`;
  const pb = document.getElementById('pageBtns');
  if (pb) {
    pb.innerHTML = Array.from({length:Math.min(pages,7)},(_,i)=>`<button class="pg-btn ${i+1===currentPage?'active':''}" onclick="goPage(${i+1})">${i+1}</button>`).join('');
  }
}

function switchTab(btn) {
  document.querySelectorAll('.oo-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentTab = btn.dataset.tab;
  currentPage = 1;
  renderTable();
}

function applyFilter() { currentPage=1; renderTable(); }
function resetFilter() {
  ['fPair','fSide','fStatus','fFrom','fTo'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  currentPage=1; renderTable();
}
function goPage(p) { currentPage=p; renderTable(); }

async function cancelOrder(id) {
  if (!confirm('Cancel this order?')) return;
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/trading/order/' + id, { method:'DELETE', headers: {'Authorization':'Bearer '+token} });
      const data = await res.json();
      if (data.success) { showToast('Order cancelled','t-ok'); await loadOrders(); return; }
    }
  } catch(e) {}
  // Local fallback
  const user = getCurrentUser();
  const orders = JSON.parse(localStorage.getItem('cx_orders_' + (user?.id||'')) || '[]');
  const o = orders.find(x => x.id === id);
  if (o) { o.status = 'cancelled'; localStorage.setItem('cx_orders_' + user.id, JSON.stringify(orders)); }
  showToast('Order cancelled','t-ok');
  await loadOrders();
}

function exportCSV() {
  const headers = ['Order ID','Time','Pair','Type','Side','Price','Amount','Total','Status'];
  const rows = allOrders.map(o => [
    o.id, new Date(o.created_at||o.time||0).toISOString(), o.pair, o.type||'limit',
    o.side, o.price||0, o.amount||0, o.total||0, o.status
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'cryptox_orders.csv';
  a.click();
}

function showToast(msg, type='t-info') {
  const c = document.getElementById('toastContainer'); if (!c) return;
  const icons = {'t-ok':'fa-check-circle','t-err':'fa-times-circle','t-warn':'fa-exclamation-triangle','t-info':'fa-info-circle'};
  const t = document.createElement('div'); t.className = 'toast ' + type;
  t.innerHTML = `<i class="toast-icon fas ${icons[type.replace('t-','')] || 'fa-info-circle'}"></i><span class="toast-msg">${msg}</span>`;
  c.appendChild(t); setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}
window.showToast = showToast;
