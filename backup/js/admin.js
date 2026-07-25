// ============================================
// CRYPTOX ADMIN — DASHBOARD JS (Updated)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthOnLoad();
  const user = requireAdmin(); if (!user) return;
  const an = document.getElementById('adminName');
  if (an) an.textContent = (user.name||'Admin').split(' ')[0];
  await loadAdminStats();
  renderRecentUsers();
  renderPendingWithdrawals();
  renderTopTraders();
  renderAdminMarkets();
  drawAdminCharts(30);
  // Auto-refresh every 15s
  setInterval(loadAdminStats, 15000);
});

async function loadAdminStats() {
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/admin/dashboard', { headers: {'Authorization':'Bearer '+token} });
      const data = await res.json();
      if (data.success) {
        const s = data.stats;
        setEl('stUsers',     s.total_users||0);
        setEl('stVol',       '$'+fmtNum(s.total_volume||0));
        setEl('stFees',      '$'+fmtNum(s.total_fees||0));
        setEl('stPendWd',    s.pending_wd||0);
        setEl('stPendKyc',   s.pending_kyc||0);
        setEl('stMarkets',   s.total_markets||0);
        setEl('stOrders',    s.total_orders||0);
        setEl('stVerified',  s.verified_users||0);
        setEl('stUsersToday','+'+(s.new_users_today||0)+' today');
        setEl('stFeesToday', 'Today: $'+(s.fees_today||0).toFixed(2));
        setEl('totalUsersB', s.total_users||0);
        setEl('pendingKycB', s.pending_kyc||0);
        setEl('pendingWdB',  s.pending_wd||0);
        const dot = document.getElementById('pendingDot');
        if (dot) dot.style.display = ((s.pending_wd||0)+(s.pending_kyc||0))>0?'block':'none';
        // Render chart data from backend
        if (data.daily_stats?.length) {
          const labels = data.daily_stats.map(d=>d.date);
          const vols   = data.daily_stats.map(d=>d.volume||0);
          const regs   = data.daily_stats.map(d=>d.registrations||0);
          setTimeout(()=>{ drawAdminLineChart('revenueChart',labels,vols,'#02c076'); drawAdminLineChart('registrationsChart',labels,regs,'#60a5fa'); },50);
        }
        if (data.recent_users) renderRecentUsersData(data.recent_users);
        if (data.pending_withdrawals) renderPendingWdData(data.pending_withdrawals);
        if (data.top_traders) renderTopTradersData(data.top_traders);
        if (data.market_overview) renderAdminMktData(data.market_overview);
        return;
      }
    }
  } catch(e) {}
  // Fallback to localStorage
  renderAdminStatsFallback();
}

function renderAdminStatsFallback() {
  const users  = getUsers();
  const orders = getAllOrders();
  const totalVol = orders.reduce((s,o) => s+(o.total||0), 0);
  const fees     = totalVol * 0.001;
  const pendWd   = getPendingWithdrawals().length;
  const pendKyc  = users.filter(u=>u.kyc_status==='pending'||u.kyc==='pending').length;
  setEl('stUsers',   users.filter(u=>u.role!=='admin').length);
  setEl('stVol',     '$'+fmtNum(totalVol));
  setEl('stFees',    '$'+fees.toFixed(2));
  setEl('stPendWd',  pendWd);
  setEl('stPendKyc', pendKyc);
  setEl('stMarkets', TRADING_PAIRS.length);
  setEl('stOrders',  orders.length);
  setEl('stVerified',users.filter(u=>u.kyc_status==='verified'||u.kyc==='verified').length);
  setEl('totalUsersB',users.filter(u=>u.role!=='admin').length);
  setEl('pendingKycB',pendKyc);
  setEl('pendingWdB', pendWd);
  const dot = document.getElementById('pendingDot');
  if (dot) dot.style.display = (pendWd+pendKyc)>0?'block':'none';
}

function renderRecentUsers() {
  const users = getUsers().filter(u=>u.role!=='admin').slice(-8).reverse();
  renderRecentUsersData(users);
}

function renderRecentUsersData(users) {
  const tbody = document.getElementById('recentUsersBody'); if (!tbody) return;
  if (!users.length) { tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--t3)">No users yet</td></tr>'; return; }
  tbody.innerHTML = users.slice(0,8).map(u=>`<tr>
    <td><div class="flex gap8">
      <div style="width:28px;height:28px;border-radius:50%;background:rgba(240,185,11,.15);color:var(--yellow);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${(u.name||'U').slice(0,2).toUpperCase()}</div>
      <div><div style="font-weight:600;font-size:12px">${u.name||'Unknown'}</div><div style="font-size:11px;color:var(--t3)">${u.email||'-'}</div></div>
    </div></td>
    <td><span class="kyc-pill kyc-${u.kyc_status||u.kyc||'unverified'}">${u.kyc_status||u.kyc||'unverified'}</span></td>
    <td><span class="status-pill sp-${u.status==='active'?'active':u.status==='suspended'?'suspended':'cancelled'}">${u.status||'active'}</span></td>
    <td style="font-size:11px;color:var(--t3)">${new Date(u.created_at||u.createdAt||0).toLocaleDateString()}</td>
    <td><a href="users.html" class="btn btn-ghost btn-xs">View</a></td>
  </tr>`).join('');
}

function renderPendingWithdrawals() {
  const wds = getPendingWithdrawals().slice(0,5);
  renderPendingWdData(wds);
}

function renderPendingWdData(wds) {
  const tbody = document.getElementById('pendingWdBody'); if (!tbody) return;
  if (!wds.length) { tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--t3)">No pending withdrawals</td></tr>'; return; }
  tbody.innerHTML = wds.slice(0,5).map(w=>`<tr>
    <td style="font-size:12px">${w.user_name||w.userName||'User'}</td>
    <td><strong>${w.coin}</strong></td>
    <td style="font-weight:600">${parseFloat(w.amount).toFixed(6)} ${w.coin}</td>
    <td style="font-size:11px;color:var(--t3)">${new Date(w.created_at||w.time||0).toLocaleDateString()}</td>
    <td><div class="flex gap4">
      <button class="btn btn-primary btn-xs" onclick="quickApproveWd('${w.id}')"><i class="fas fa-check"></i></button>
      <button class="btn btn-dark btn-xs" onclick="quickRejectWd('${w.id}')"><i class="fas fa-times" style="color:var(--red)"></i></button>
    </div></td>
  </tr>`).join('');
}

function renderTopTraders() {
  const traders = Array.from({length:6},(_,i)=>({
    name:'Trader'+(i+1), volume:Math.random()*80000+5000, trades:Math.floor(Math.random()*80+5)
  })).sort((a,b)=>b.volume-a.volume);
  renderTopTradersData(traders);
}

function renderTopTradersData(traders) {
  const tbody = document.getElementById('topTradersBody'); if (!tbody) return;
  tbody.innerHTML = traders.slice(0,6).map((t,i)=>`<tr>
    <td style="color:var(--t3);font-weight:700">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
    <td style="font-weight:600">${t.name||'User'}</td>
    <td>$${fmtNum(t.volume||0)}</td>
    <td style="color:var(--t2)">${t.trade_count||t.trades||0}</td>
  </tr>`).join('')||'<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--t3)">No data</td></tr>';
}

function renderAdminMarkets() {
  renderAdminMktData(TRADING_PAIRS.slice(0,8).map(p=>({pair:p.pair,price:p.price,volume_quote:parseFloat(p.vol?.replace(/[^0-9.]/g,'')||0)*1e6,change_pct:p.change})));
}

function renderAdminMktData(markets) {
  const tbody = document.getElementById('adminMktBody'); if (!tbody) return;
  tbody.innerHTML = markets.slice(0,8).map(m=>`<tr>
    <td><strong>${m.pair}</strong></td>
    <td style="font-weight:600">$${m.price>100?parseFloat(m.price).toFixed(2):parseFloat(m.price).toFixed(6)}</td>
    <td style="color:var(--t2)">$${fmtNum(m.volume_quote||0)}</td>
    <td class="${(m.change_pct||m.change||0)>=0?'positive':'negative'}">${(m.change_pct||m.change||0)>=0?'+':''}${parseFloat(m.change_pct||m.change||0).toFixed(2)}%</td>
  </tr>`).join('');
}

function drawAdminCharts(n=30) {
  const days = Array.from({length:n},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(n-1-i)); return d.toLocaleDateString('en',{month:'short',day:'numeric'}); });
  const rev  = Array.from({length:n},()=>Math.random()*8000+500);
  const regs = Array.from({length:n},()=>Math.floor(Math.random()*30+2));
  setTimeout(()=>{ drawAdminLineChart('revenueChart',days,rev,'#02c076'); drawAdminLineChart('registrationsChart',days,regs,'#60a5fa'); },100);
}

function switchChartPeriod(btn) {
  document.querySelectorAll('.pbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  drawAdminCharts(parseInt(btn.dataset.p)||30);
}

// ---- Helpers ----
async function quickApproveWd(id) {
  try {
    const token=localStorage.getItem('cx_token');
    if (token) { const r=await fetch('/api/wallet/admin/withdrawals/'+id,{method:'PUT',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({status:'approved',admin_note:'Approved by admin'})}); const d=await r.json(); if(d.success){showToast('Withdrawal approved','t-ok');await loadAdminStats();return;} }
  }catch(e){}
  const wds=JSON.parse(localStorage.getItem('cx_withdrawals')||'[]');
  const w=wds.find(x=>x.id===id); if(w){w.status='approved';localStorage.setItem('cx_withdrawals',JSON.stringify(wds));}
  renderPendingWithdrawals(); renderAdminStatsFallback();
  showToast('Withdrawal approved','t-ok');
}

async function quickRejectWd(id) {
  try {
    const token=localStorage.getItem('cx_token');
    if (token) { const r=await fetch('/api/wallet/admin/withdrawals/'+id,{method:'PUT',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({status:'rejected',admin_note:'Rejected by admin'})}); const d=await r.json(); if(d.success){showToast('Withdrawal rejected','t-info');await loadAdminStats();return;} }
  }catch(e){}
  const wds=JSON.parse(localStorage.getItem('cx_withdrawals')||'[]');
  const w=wds.find(x=>x.id===id); if(w){w.status='rejected';localStorage.setItem('cx_withdrawals',JSON.stringify(wds));}
  renderPendingWithdrawals(); renderAdminStatsFallback();
  showToast('Withdrawal rejected','t-info');
}

function getAllOrders() {
  let all = [];
  getUsers().forEach(u => {
    const orders=JSON.parse(localStorage.getItem('cx_orders_'+(u.id||''))||'[]');
    all=all.concat(orders.map(o=>({...o,userId:u.id,userName:u.name})));
  });
  return all;
}

function getPendingWithdrawals() {
  let wds = JSON.parse(localStorage.getItem('cx_withdrawals')||'[]');
  if (!wds.length) {
    const coins=['BTC','ETH','USDT','BNB','SOL'];
    for(let i=0;i<4;i++) wds.push({id:'WD'+Date.now()+i,user_name:'Demo User '+(i+1),coin:coins[i%coins.length],amount:(Math.random()*.5+.01).toFixed(4),address:'0x'+Math.random().toString(16).slice(2,42),status:'pending',created_at:Date.now()-i*3600000});
    localStorage.setItem('cx_withdrawals',JSON.stringify(wds));
  }
  return wds.filter(w=>w.status==='pending');
}

function setEl(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function fmtNum(n){if(n>=1e9)return(n/1e9).toFixed(2)+'B';if(n>=1e6)return(n/1e6).toFixed(2)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return parseFloat(n).toFixed(2);}
function formatVolume(n){return fmtNum(n);}

function showToast(msg,type='t-info'){
  let c=document.getElementById('toastContainer');
  if(!c){c=document.createElement('div');c.id='toastContainer';c.className='toast-container';document.body.appendChild(c);}
  const icons={'t-ok':'fa-check-circle','t-err':'fa-times-circle','t-warn':'fa-exclamation-triangle','t-info':'fa-info-circle'};
  const t=document.createElement('div'); t.className='toast '+type;
  t.innerHTML=`<i class="toast-icon fas ${icons[type.replace('t-','')||'info']||'fa-info-circle'}"></i><span class="toast-msg">${msg}</span>`;
  c.appendChild(t); setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400);},3200);
}
window.showToast=showToast;
