// ============================================
// CRYPTOX ADMIN — WITHDRAWALS PAGE JS
// ============================================
let allWds = [];
let currentWdId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthOnLoad();
  const user = requireAdmin(); if (!user) return;
  await loadWithdrawals();
});

async function loadWithdrawals() {
  const status = document.getElementById('wdStatusFilter')?.value || 'pending';
  const search = document.getElementById('wdSearch')?.value?.toLowerCase() || '';
  const tbody  = document.getElementById('wdTbody'); if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--t3)"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const r = await fetch('/api/wallet/admin/withdrawals?status='+status+'&limit=100', { headers: {'Authorization':'Bearer '+token} });
      const d = await r.json();
      if (d.success) { allWds = d.withdrawals; renderTable(allWds, search); updateStats(allWds); return; }
    }
  }catch(e){}

  // Fallback from localStorage
  let wds = JSON.parse(localStorage.getItem('cx_withdrawals')||'[]');
  if (status !== 'all') wds = wds.filter(w => w.status === status);
  allWds = wds;
  renderTable(allWds, search);
  updateStats(allWds);
}

function renderTable(wds, search='') {
  const tbody = document.getElementById('wdTbody'); if (!tbody) return;
  let list = wds;
  if (search) list = list.filter(w => (w.user_name||'').toLowerCase().includes(search) || (w.coin||'').toLowerCase().includes(search));
  if (!list.length) { tbody.innerHTML='<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--t3)"><i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;opacity:.4"></i>No withdrawals found</td></tr>'; return; }
  tbody.innerHTML = list.map(w=>`<tr>
    <td style="font-size:10px;font-family:monospace;color:var(--t3)">${(w.id||'').slice(0,10)}...</td>
    <td><div style="font-size:12px;font-weight:600">${w.user_name||'User'}</div><div style="font-size:10px;color:var(--t3)">${w.user_email||'-'}</div></td>
    <td><strong>${w.coin}</strong></td>
    <td style="color:var(--t3);font-size:11px">${w.network||'-'}</td>
    <td style="text-align:right;font-weight:700">${parseFloat(w.amount||0).toFixed(6)}</td>
    <td style="text-align:right;color:var(--yellow)">${parseFloat(w.fee||0).toFixed(6)}</td>
    <td style="font-size:10px;font-family:monospace;color:var(--t3);max-width:120px;overflow:hidden;text-overflow:ellipsis">${(w.address||'-').slice(0,16)}...</td>
    <td style="font-size:11px;color:var(--t3)">${new Date(w.created_at||w.time||0).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
    <td><span class="status-pill sp-${w.status==='approved'?'filled':w.status==='rejected'?'cancelled':'pending'}">${w.status||'pending'}</span></td>
    <td>${w.status==='pending'?`<div class="flex gap4">
      <button class="btn btn-primary btn-xs" onclick="reviewWd('${w.id}','approve')"><i class="fas fa-check"></i></button>
      <button class="btn btn-dark btn-xs" onclick="reviewWd('${w.id}','reject')"><i class="fas fa-times" style="color:var(--red)"></i></button>
      <button class="btn btn-ghost btn-xs" onclick="showWdDetail('${w.id}')"><i class="fas fa-eye"></i></button>
    </div>`:'-'}</td>
  </tr>`).join('');
}

function updateStats(wds) {
  const all = JSON.parse(localStorage.getItem('cx_withdrawals')||'[]');
  setEl('wdPending',  (wds.filter(w=>w.status==='pending')||[]).length);
  setEl('wdApproved', (wds.filter(w=>w.status==='approved')||[]).length);
  setEl('wdRejected', (wds.filter(w=>w.status==='rejected')||[]).length);
  const vol = wds.reduce((s,w)=>s+parseFloat(w.amount||0)*0.0001,0); // rough USDT equiv
  setEl('wdVolume', '$'+vol.toFixed(2));
}

async function reviewWd(id, action) {
  const note = action==='reject' ? prompt('Rejection reason (optional):') : '';
  if (action==='reject' && note===null) return; // cancelled
  try {
    const token=localStorage.getItem('cx_token');
    if (token) {
      const r=await fetch('/api/wallet/admin/withdrawals/'+id,{method:'PUT',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({status:action==='approve'?'approved':'rejected',admin_note:note||''})});
      const d=await r.json();
      if (d.success) { showToast('Withdrawal '+(action==='approve'?'approved':'rejected'),'t-ok'); await loadWithdrawals(); return; }
      showToast(d.message||'Failed','t-err'); return;
    }
  }catch(e){}
  // Fallback
  const wds=JSON.parse(localStorage.getItem('cx_withdrawals')||'[]');
  const w=wds.find(x=>x.id===id); if(w){w.status=action==='approve'?'approved':'rejected';w.admin_note=note||'';localStorage.setItem('cx_withdrawals',JSON.stringify(wds));}
  showToast('Withdrawal '+(action==='approve'?'approved':'rejected'),'t-ok');
  await loadWithdrawals();
}

function showWdDetail(id) {
  const w = allWds.find(x=>x.id===id); if (!w) return;
  const modal=document.getElementById('wdModal'); const body=document.getElementById('wdModalBody');
  if (!modal||!body) return;
  body.innerHTML=`
    <div class="user-detail-grid" style="grid-template-columns:1fr 1fr">
      <div class="udetail-item"><label>User</label><span>${w.user_name||'Unknown'}</span></div>
      <div class="udetail-item"><label>Email</label><span>${w.user_email||'-'}</span></div>
      <div class="udetail-item"><label>Coin</label><span><strong>${w.coin}</strong> via ${w.network}</span></div>
      <div class="udetail-item"><label>Amount</label><span style="color:var(--red);font-weight:700">${parseFloat(w.amount||0).toFixed(6)} ${w.coin}</span></div>
      <div class="udetail-item"><label>Fee</label><span>${parseFloat(w.fee||0).toFixed(6)} ${w.coin}</span></div>
      <div class="udetail-item"><label>Net Amount</label><span>${(parseFloat(w.amount||0)-parseFloat(w.fee||0)).toFixed(6)} ${w.coin}</span></div>
    </div>
    <div class="form-group"><label>Recipient Address</label><div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:10px;font-family:monospace;font-size:12px;word-break:break-all">${w.address||'-'}</div></div>
    <div class="form-group"><label>Admin Note (optional)</label><textarea id="wdNoteInput" class="form-textarea" placeholder="Add a note...">${w.admin_note||''}</textarea></div>`;
  document.getElementById('approveWdBtn').onclick = () => { const n=document.getElementById('wdNoteInput').value; modal.classList.add('hidden'); reviewWd(id,'approve'); };
  document.getElementById('rejectWdBtn').onclick  = () => { const n=document.getElementById('wdNoteInput').value; modal.classList.add('hidden'); reviewWd(id,'reject'); };
  modal.classList.remove('hidden');
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
