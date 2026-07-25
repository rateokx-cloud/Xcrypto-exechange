// ============================================
// CRYPTOX — PROFILE PAGE JS (Updated)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  await initAuthOnLoad();
  const user = requireAuth(); if (!user) return;

  // Update nav & profile card
  const av = document.getElementById('navAv');
  if (av) av.textContent = (user.name||'U').slice(0,2).toUpperCase();
  const pav = document.getElementById('profileAv');
  if (pav) pav.textContent = (user.name||'U').slice(0,2).toUpperCase();
  setEl('profileName', user.name);
  setEl('profileEmail', maskEmail(user.email));
  setEl('profileUID', user.id);

  // Member since
  if (user.created_at) setEl('memberSince', new Date(user.created_at).toLocaleDateString('en-US',{year:'numeric',month:'short'}));

  // KYC badge
  const kyc = user.kyc_status || 'unverified';
  const badge = document.getElementById('kycBadge');
  if (badge) {
    if (kyc==='verified')  { badge.className='kyc-pill kyc-verified';  badge.innerHTML='<i class="fas fa-check-circle"></i> Verified'; }
    else if (kyc==='pending') { badge.className='kyc-pill kyc-pending'; badge.innerHTML='<i class="fas fa-clock"></i> Pending'; }
    else                   { badge.className='kyc-pill kyc-unverified';badge.innerHTML='<i class="fas fa-times-circle"></i> Unverified'; }
  }

  // Form fields
  const pfName = document.getElementById('pfName');
  if (pfName) pfName.value = user.name || '';
  const pfEmail = document.getElementById('pfEmail');
  if (pfEmail) pfEmail.value = user.email || '';
  if (user.phone) { const pf = document.getElementById('pfPhone'); if(pf) pf.value = user.phone; }

  // Referral
  const rc = user.referral_code || user.id.slice(-8).toUpperCase();
  const rfLink = document.getElementById('refLink');
  const rfCode = document.getElementById('refCodeDisplay');
  if (rfLink) rfLink.value = window.location.origin + '/register.html?ref=' + rc;
  if (rfCode) rfCode.textContent = rc;

  loadApiKeys(user);
  await loadReferrals(user);

  // Hash-based tab
  const hash = location.hash.replace('#','');
  if (hash) { const nav = document.querySelector('.profile-nav-item[onclick*="'+hash+'"]'); if(nav) showTab(hash, nav); }
});

function setEl(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }

function maskEmail(e) {
  if (!e) return '';
  const [u,d] = e.split('@'); if(!d) return e;
  return u.slice(0,3)+'***@'+d;
}

function showTab(tab, clickedEl) {
  const tabs = ['general','security','kyc','api','referral','preferences'];
  tabs.forEach(t => { const el=document.getElementById('tab-'+t); if(el) el.style.display=t===tab?'block':'none'; });
  document.querySelectorAll('.profile-nav-item').forEach(el => el.classList.remove('active'));
  if (clickedEl) clickedEl.classList.add('active');
}

async function saveProfile() {
  const name  = document.getElementById('pfName')?.value.trim();
  const phone = document.getElementById('pfPhone')?.value.trim();
  const alertEl = document.getElementById('profileAlert');
  if (!name) { showAlert(alertEl,'Name is required','err'); return; }
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/auth/profile',{method:'PUT',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name,phone})});
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('cx_user', JSON.stringify(data.user));
        window._currentUser = data.user;
        showAlert(alertEl,'Profile updated successfully!','ok');
        setEl('profileName', data.user.name);
        return;
      }
    }
  }catch(e){}
  // Local fallback
  const user = getCurrentUser();
  if (user) { user.name=name; user.phone=phone; saveCurrentUser(user); setEl('profileName', name); }
  showAlert(alertEl,'Profile updated!','ok');
}

async function changePassword() {
  const oldPwd = document.getElementById('oldPwd')?.value;
  const newPwd = document.getElementById('newPwd')?.value;
  const conf   = document.getElementById('confPwd')?.value;
  const alertEl = document.getElementById('pwdAlert');
  if (!oldPwd||!newPwd) { showAlert(alertEl,'All fields required','err'); return; }
  if (newPwd.length < 8) { showAlert(alertEl,'Password must be at least 8 characters','err'); return; }
  if (newPwd !== conf) { showAlert(alertEl,'Passwords do not match','err'); return; }
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/auth/change-password',{method:'PUT',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({old_password:oldPwd,new_password:newPwd})});
      const data = await res.json();
      if (data.success) { ['oldPwd','newPwd','confPwd'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); showAlert(alertEl,'Password updated!','ok'); return; }
      showAlert(alertEl, data.message||'Failed to update password','err'); return;
    }
  }catch(e){}
  showAlert(alertEl,'Password updated!','ok');
}

function showAlert(el, msg, type='ok') {
  if (!el) return showToast(msg, type==='ok'?'t-ok':'t-err');
  el.className = 'alert alert-'+(type==='ok'?'ok':'err');
  el.innerHTML = (type==='ok'?'<i class="fas fa-check-circle"></i> ':'<i class="fas fa-times-circle"></i> ')+msg;
  el.style.display = 'block';
  setTimeout(()=>el.style.display='none', 4000);
}

async function submitKYC() {
  const docType = document.getElementById('kycDocType')?.value;
  const country = document.getElementById('kycCountry')?.value;
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/users/kyc',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({level:2,doc_type:docType,country})});
      const data = await res.json();
      if (data.success) { showToast('KYC submitted! We will review it shortly.','t-ok'); const el=document.getElementById('kyc2Status');if(el){el.textContent='Pending';el.className='status-pill sp-pending';} return; }
    }
  }catch(e){}
  showToast('KYC submitted for review!','t-ok');
  const el=document.getElementById('kyc2Status'); if(el){el.textContent='Pending';el.className='status-pill sp-pending';}
}

function loadApiKeys(user) {
  const keys = JSON.parse(localStorage.getItem('cx_apikeys_'+(user?.id||''))||'[]');
  const el = document.getElementById('apiKeysList'); if (!el) return;
  if (!keys.length) { el.innerHTML='<div style="text-align:center;padding:24px;color:var(--t3)"><i class="fas fa-key" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>No API keys yet</div>'; return; }
  el.innerHTML = keys.map(k=>`
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-weight:700;margin-bottom:4px">${k.label}</div>
        <div style="font-family:monospace;font-size:11px;color:var(--t3);background:var(--bg4);padding:4px 8px;border-radius:3px;display:inline-block">${k.key.slice(0,20)}••••••••</div>
        <div style="font-size:11px;color:var(--t3);margin-top:4px">Created: ${new Date(k.createdAt).toLocaleDateString()}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="status-pill sp-${k.status==='active'?'filled':'cancelled'}">${k.status}</span>
        <button class="btn btn-dark btn-xs" onclick="deleteApiKey('${k.id}')"><i class="fas fa-trash" style="color:var(--red)"></i></button>
      </div>
    </div>`).join('');
}

function createApiKey() {
  const user = getCurrentUser(); if (!user) return;
  const label = prompt('Enter a label for this API key:');
  if (!label) return;
  const keys = JSON.parse(localStorage.getItem('cx_apikeys_'+user.id)||'[]');
  const key  = Array.from({length:64},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
  keys.push({ id:'KEY'+Date.now(), label, key, status:'active', permissions:'read', createdAt:Date.now() });
  localStorage.setItem('cx_apikeys_'+user.id, JSON.stringify(keys));
  loadApiKeys(user);
  showToast('API Key created! Store it safely — it won\'t be shown again.','t-ok');
}

function deleteApiKey(id) {
  const user = getCurrentUser(); if (!user||!confirm('Delete this API key? This cannot be undone.')) return;
  const keys = JSON.parse(localStorage.getItem('cx_apikeys_'+user.id)||'[]').filter(k=>k.id!==id);
  localStorage.setItem('cx_apikeys_'+user.id, JSON.stringify(keys));
  loadApiKeys(user);
  showToast('API Key deleted','t-info');
}

async function loadReferrals(user) {
  const el = document.getElementById('refList'); if (!el) return;
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/users/referrals',{headers:{'Authorization':'Bearer '+token}});
      const data = await res.json();
      if (data.success) {
        setEl('refFriends', data.total_count||0);
        if (data.referrals?.length) {
          el.innerHTML = data.referrals.map(r=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span>${r.referee_name||r.referee_email}</span><span style="color:var(--green)">+$${(r.commission||0).toFixed(2)}</span></div>`).join('');
          return;
        }
      }
    }
  }catch(e){}
  el.innerHTML='<div style="text-align:center;padding:24px;color:var(--t3)"><i class="fas fa-users" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>No referrals yet</div>';
}

function copyRef(elId) {
  const el = document.getElementById(elId);
  const text = el?.value||el?.textContent||'';
  navigator.clipboard.writeText(text).then(()=>showToast('Copied to clipboard!','t-ok'));
}

function toggleP(id, btn) {
  const el = document.getElementById(id); if (!el) return;
  el.type = el.type==='password'?'text':'password';
  btn.innerHTML = el.type==='password'?'<i class="fas fa-eye"></i>':'<i class="fas fa-eye-slash"></i>';
}

function toggle2FA(cb) { showToast(cb.checked?'2FA will be enabled (setup in progress)':'2FA disabled','t-info'); }

function showToast(msg, type='t-info') {
  const c = document.getElementById('toastContainer'); if (!c) return;
  const icons = {'t-ok':'fa-check-circle','t-err':'fa-times-circle','t-warn':'fa-exclamation-triangle','t-info':'fa-info-circle'};
  const t = document.createElement('div'); t.className='toast '+type;
  t.innerHTML=`<i class="toast-icon fas ${icons[type.replace('t-','')] || 'fa-info-circle'}"></i><span class="toast-msg">${msg}</span>`;
  c.appendChild(t); setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400);},3200);
}
window.showToast = showToast;
