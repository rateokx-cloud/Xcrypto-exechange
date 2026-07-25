// ============================================
// CRYPTOX ADMIN — USERS PAGE JS (Updated)
// ============================================
let usersData = [];
let currentPage = 1;
const PAGE_SIZE = 20;

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthOnLoad();
  const user = requireAdmin(); if (!user) return;
  await loadStats();
  await loadUsers();
});

async function loadStats() {
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const r = await fetch('/api/users/admin/stats', { headers: {'Authorization':'Bearer '+token} });
      const d = await r.json();
      if (d.success) {
        setEl('usTotal',     d.stats.total||0);
        setEl('usActive',    d.stats.active||0);
        setEl('usVerified',  d.stats.verified||0);
        setEl('usSuspended', d.stats.suspended||0);
        return;
      }
    }
  }catch(e){}
  const users = getUsers().filter(u=>u.role!=='admin');
  setEl('usTotal',     users.length);
  setEl('usActive',    users.filter(u=>u.status==='active').length);
  setEl('usVerified',  users.filter(u=>(u.kyc_status||u.kyc)==='verified').length);
  setEl('usSuspended', users.filter(u=>u.status==='suspended').length);
}

async function loadUsers() {
  const search = document.getElementById('userSearch')?.value?.trim() || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const kyc    = document.getElementById('filterKyc')?.value || '';
  const tbody  = document.getElementById('usersTbody'); if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--t3)"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const params = new URLSearchParams({ limit:50, offset:(currentPage-1)*PAGE_SIZE });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (kyc)    params.set('kyc_status', kyc);
      const r = await fetch('/api/users/admin/list?'+params, { headers: {'Authorization':'Bearer '+token} });
      const d = await r.json();
      if (d.success) { usersData=d.users; renderUsersTable(d.users, d.total); return; }
    }
  }catch(e){}

  // Fallback
  let users = getUsers().filter(u=>u.role!=='admin');
  if (search) users = users.filter(u=>(u.name+u.email+u.id).toLowerCase().includes(search.toLowerCase()));
  if (status) users = users.filter(u=>u.status===status);
  if (kyc)    users = users.filter(u=>(u.kyc_status||u.kyc)===kyc);
  usersData = users;
  renderUsersTable(users, users.length);
}

function renderUsersTable(users, total) {
  const tbody = document.getElementById('usersTbody');
  setEl('userCount', total+' users');
  if (!users.length) { tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--t3)"><i class="fas fa-users" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>No users found</td></tr>'; return; }
  tbody.innerHTML = users.map(u=>`<tr>
    <td><div class="flex gap8">
      <div style="width:32px;height:32px;border-radius:50%;background:rgba(240,185,11,.15);color:var(--yellow);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${(u.name||'U').slice(0,2).toUpperCase()}</div>
      <div><div style="font-weight:600;font-size:12px">${u.name||'Unknown'}</div><div style="font-size:11px;color:var(--t3)">${u.email||'-'}</div></div>
    </div></td>
    <td style="font-family:monospace;font-size:11px;color:var(--t3)">${(u.id||'').slice(0,12)}...</td>
    <td><span class="kyc-pill kyc-${u.kyc_status||u.kyc||'unverified'}">${u.kyc_status||u.kyc||'unverified'}</span></td>
    <td><span class="status-pill sp-${u.status==='active'?'active':u.status==='suspended'?'suspended':'cancelled'}">${u.status||'active'}</span></td>
    <td style="color:var(--yellow);font-weight:600">VIP ${u.vip_level||0}</td>
    <td style="font-size:11px;color:var(--t3)">${new Date(u.created_at||u.createdAt||0).toLocaleDateString()}</td>
    <td style="font-size:11px;color:var(--t3)">${u.last_login?new Date(u.last_login).toLocaleDateString():'-'}</td>
    <td><div class="flex gap4">
      <button class="btn btn-ghost btn-xs" onclick="viewUser('${u.id}')"><i class="fas fa-eye"></i></button>
      <button class="btn btn-dark btn-xs" onclick="toggleUserStatus('${u.id}','${u.status||'active'}')">${(u.status||'active')==='active'?'<i class="fas fa-ban" style="color:var(--yellow)"></i>':'<i class="fas fa-check" style="color:var(--green)"></i>'}</button>
    </div></td>
  </tr>`).join('');

  const pi=document.getElementById('usersPageInfo'); if(pi) pi.textContent=`Showing ${users.length} of ${total}`;
  const pb=document.getElementById('usersPageBtns'); if(pb){ const pages=Math.ceil(total/PAGE_SIZE); pb.innerHTML=Array.from({length:Math.min(pages,7)},(_,i)=>`<button class="pg-btn ${i+1===currentPage?'active':''}" onclick="currentPage=${i+1};loadUsers()">${i+1}</button>`).join('');}
}

async function viewUser(id) {
  const modal=document.getElementById('userModal'); const body=document.getElementById('userModalBody'); const foot=document.getElementById('userModalFoot');
  if (!modal||!body||!foot) return;
  body.innerHTML='<div style="text-align:center;padding:32px;color:var(--t3)"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  modal.classList.remove('hidden');
  try {
    const token=localStorage.getItem('cx_token');
    if (token) {
      const r=await fetch('/api/users/admin/'+id,{headers:{'Authorization':'Bearer '+token}});
      const d=await r.json();
      if (d.success) {
        const u=d.user; const bals=d.balances||[];
        body.innerHTML=`
          <div class="user-detail-grid">
            <div class="udetail-item"><label>Name</label><span>${u.name||'-'}</span></div>
            <div class="udetail-item"><label>Email</label><span>${u.email||'-'}</span></div>
            <div class="udetail-item"><label>UID</label><span style="font-family:monospace;font-size:11px">${u.id}</span></div>
            <div class="udetail-item"><label>KYC Status</label><span><span class="kyc-pill kyc-${u.kyc_status||'unverified'}">${u.kyc_status||'unverified'}</span></span></div>
            <div class="udetail-item"><label>Account Status</label><span><span class="status-pill sp-${u.status==='active'?'active':'suspended'}">${u.status||'active'}</span></span></div>
            <div class="udetail-item"><label>Joined</label><span>${new Date(u.created_at||0).toLocaleDateString()}</span></div>
          </div>
          <h4 style="font-size:13px;font-weight:700;margin-bottom:10px">Balances</h4>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
            ${bals.map(b=>`<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:10px;text-align:center"><div style="font-weight:700">${b.coin}</div><div style="font-size:13px;margin-top:2px">${parseFloat(b.available||0).toFixed(4)}</div></div>`).join('')}
          </div>`;
        foot.innerHTML=`
          <button class="btn btn-ghost" onclick="document.getElementById('userModal').classList.add('hidden')">Close</button>
          <button class="btn btn-primary" onclick="setCredit('${u.id}')">Credit Balance</button>
          <button class="btn btn-dark" onclick="toggleUserStatus('${u.id}','${u.status||'active'}');document.getElementById('userModal').classList.add('hidden')">${u.status==='active'?'Suspend':'Activate'} User</button>`;
        return;
      }
    }
  }catch(e){}
  body.innerHTML='<div style="padding:20px;color:var(--t2)">User details unavailable in offline mode.</div>';
}

async function toggleUserStatus(id, currentStatus) {
  const newStatus = currentStatus==='active' ? 'suspended' : 'active';
  if (!confirm(`${newStatus==='suspended'?'Suspend':'Activate'} this user?`)) return;
  try {
    const token=localStorage.getItem('cx_token');
    if (token) {
      const r=await fetch('/api/users/admin/'+id+'/status',{method:'PUT',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({status:newStatus})});
      const d=await r.json();
      if (d.success) { showToast('User '+newStatus,'t-ok'); loadUsers(); return; }
    }
  }catch(e){}
  const users=getUsers(); const u=users.find(x=>x.id===id); if(u){u.status=newStatus;saveUsers(users);}
  showToast('User '+newStatus,'t-ok'); loadUsers();
}

function showCreditModal() { document.getElementById('creditModal').classList.remove('hidden'); }
function setCredit(uid) { document.getElementById('creditModal').classList.remove('hidden'); const el=document.getElementById('creditUserId'); if(el) el.value=uid; document.getElementById('userModal').classList.add('hidden'); }

async function submitCredit() {
  const uid=document.getElementById('creditUserId').value;
  const coin=document.getElementById('creditCoin').value;
  const amount=parseFloat(document.getElementById('creditAmount').value);
  if (!uid||!coin||!amount||amount<=0) { showToast('Fill all fields','t-err'); return; }
  try {
    const token=localStorage.getItem('cx_token');
    if (token) {
      const r=await fetch('/api/wallet/admin/credit',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({user_id:uid,coin,amount})});
      const d=await r.json();
      if (d.success) { showToast(amount+' '+coin+' credited to user','t-ok'); document.getElementById('creditModal').classList.add('hidden'); return; }
      showToast(d.message||'Credit failed','t-err'); return;
    }
  }catch(e){}
  showToast('Credit processed (offline mode)','t-ok');
  document.getElementById('creditModal').classList.add('hidden');
}

function exportUsers() {
  const headers=['UID','Name','Email','Status','KYC','VIP','Joined'];
  const rows=usersData.map(u=>[u.id,u.name,u.email,u.status||'active',u.kyc_status||'unverified',u.vip_level||0,new Date(u.created_at||0).toLocaleDateString()]);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='users.csv'; a.click();
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
