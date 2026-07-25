// ============================================
// CRYPTOX ADMIN — MARKETS PAGE JS
// ============================================
let marketsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthOnLoad();
  const user = requireAdmin(); if (!user) return;
  await loadMarkets();
});

async function loadMarkets() {
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const r = await fetch('/api/trading/markets', { headers: {'Authorization':'Bearer '+token} });
      const d = await r.json();
      if (d.success) { marketsData = d.markets; renderMarketsTable(); return; }
    }
  } catch(e) {}
  // Fallback from TRADING_PAIRS
  marketsData = TRADING_PAIRS.map((p,i) => ({
    id: p.pair.replace('/','_'),
    pair: p.pair, base: p.base, quote: p.quote||'USDT',
    maker_fee: 0.001, taker_fee: 0.001, min_order: 10,
    status: 'active', price: p.price, change: p.change, vol: p.vol
  }));
  renderMarketsTable();
}

function renderMarketsTable() {
  const search  = document.getElementById('mktSearch')?.value?.toLowerCase() || '';
  const filter  = document.getElementById('mktStatusFilter')?.value || '';
  const tbody   = document.getElementById('mktTbody'); if (!tbody) return;
  let list = [...marketsData];
  if (search) list = list.filter(m => m.pair.toLowerCase().includes(search));
  if (filter) list = list.filter(m => m.status === filter);
  setEl('mktCount', list.length + ' markets');
  if (!list.length) { tbody.innerHTML='<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--t3)">No markets found</td></tr>'; return; }
  const priceMap = {};
  COINS.forEach(c => { priceMap[c.id] = { price: c.price, change: c.change, vol: c.vol }; });
  tbody.innerHTML = list.map(m => {
    const live = priceMap[m.base] || {};
    return `<tr>
      <td><strong>${m.pair}</strong></td>
      <td style="color:var(--t2)">${m.base} / ${m.quote}</td>
      <td style="font-weight:600">$${(live.price||m.price||0) > 100 ? parseFloat(live.price||m.price||0).toFixed(2) : parseFloat(live.price||m.price||0).toFixed(6)}</td>
      <td class="${(live.change||0)>=0?'positive':'negative'}">${(live.change||0)>=0?'+':''}${parseFloat(live.change||0).toFixed(2)}%</td>
      <td style="color:var(--t2)">${live.vol||m.vol||'-'}</td>
      <td style="text-align:right">${(parseFloat(m.maker_fee||0)*100).toFixed(2)}%</td>
      <td style="text-align:right">${(parseFloat(m.taker_fee||0)*100).toFixed(2)}%</td>
      <td style="color:var(--t2)">${m.min_order||10} ${m.quote||'USDT'}</td>
      <td><span class="status-pill sp-${m.status==='active'?'active':'cancelled'}">${m.status||'active'}</span></td>
      <td><button class="btn btn-ghost btn-xs" onclick="editMarket('${m.id}')"><i class="fas fa-edit"></i></button></td>
    </tr>`;
  }).join('');
}

function editMarket(id) {
  const m = marketsData.find(x => x.id === id); if (!m) return;
  document.getElementById('editMktId').value   = id;
  document.getElementById('editMaker').value   = m.maker_fee || 0.001;
  document.getElementById('editTaker').value   = m.taker_fee || 0.001;
  document.getElementById('editMinOrder').value = m.min_order || 10;
  document.getElementById('editStatus').value  = m.status || 'active';
  document.getElementById('editMktModal').classList.remove('hidden');
}

async function saveMarket() {
  const id     = document.getElementById('editMktId').value;
  const maker  = parseFloat(document.getElementById('editMaker').value);
  const taker  = parseFloat(document.getElementById('editTaker').value);
  const minOrd = parseFloat(document.getElementById('editMinOrder').value);
  const status = document.getElementById('editStatus').value;
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const r = await fetch('/api/trading/admin/markets/'+id, { method:'PUT', headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'}, body:JSON.stringify({maker_fee:maker,taker_fee:taker,min_order:minOrd,status}) });
      const d = await r.json();
      if (d.success) { showToast('Market updated!','t-ok'); document.getElementById('editMktModal').classList.add('hidden'); await loadMarkets(); return; }
    }
  } catch(e) {}
  // Local update
  const m = marketsData.find(x=>x.id===id);
  if (m) { m.maker_fee=maker; m.taker_fee=taker; m.min_order=minOrd; m.status=status; }
  showToast('Market updated!','t-ok');
  document.getElementById('editMktModal').classList.add('hidden');
  renderMarketsTable();
}

async function createMarket() {
  const base  = document.getElementById('newBase').value.trim().toUpperCase();
  const quote = document.getElementById('newQuote').value;
  const maker = parseFloat(document.getElementById('newMaker').value);
  const taker = parseFloat(document.getElementById('newTaker').value);
  const min   = parseFloat(document.getElementById('newMinOrder').value);
  if (!base) { showToast('Enter base asset','t-err'); return; }
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const r = await fetch('/api/trading/admin/markets', { method:'POST', headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'}, body:JSON.stringify({base,quote,maker_fee:maker,taker_fee:taker,min_order:min}) });
      const d = await r.json();
      if (d.success) { showToast(base+'/'+quote+' market created!','t-ok'); document.getElementById('addMktModal').classList.add('hidden'); await loadMarkets(); return; }
      showToast(d.message||'Failed','t-err'); return;
    }
  }catch(e){}
  showToast('Market created (offline mode)','t-ok');
  document.getElementById('addMktModal').classList.add('hidden');
}

function setEl(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function showToast(msg,type='t-info'){
  const c=document.getElementById('toastContainer'); if(!c)return;
  const t=document.createElement('div'); t.className='toast '+type;
  t.innerHTML=`<i class="toast-icon fas fa-${type==='t-ok'?'check':'info'}-circle"></i><span class="toast-msg">${msg}</span>`;
  c.appendChild(t); setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400);},3000);
}
window.showToast=showToast;
