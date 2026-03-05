
// ============================================================
// eMatch — js/app.js  (v2.2 — Complete)
// ============================================================

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  browserLocalPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  addDoc, collection,
  serverTimestamp,
  query, where, orderBy, limit,
  getDocs, onSnapshot,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── 1. FIREBASE CONFIG ─────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAW921oL1KTEk5n75xWvfGWM4Ab1SKnpbg",
  authDomain: "ematch-bb818.firebaseapp.com",
  databaseURL: "https://ematch-bb818-default-rtdb.firebaseio.com",
  projectId: "ematch-bb818",
  storageBucket: "ematch-bb818.firebasestorage.app",
  messagingSenderId: "955647946180",
  appId: "1:955647946180:web:c66947044f0dd6f633c891"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

setPersistence(auth, browserLocalPersistence);

// ── 2. GLOBAL STATE ────────────────────────────────────────
let currentUser     = null;
let currentUserData = null;
let isOnline        = navigator.onLine;

window._ematch_config   = firebaseConfig;
window._ematch_db       = db;
window._ematch_uid      = null;
window._ematch_userdata = null;

// ── PAGE CACHE ─────────────────────────────────────────────
const PageCache = {
  set(key, data) {
    try { localStorage.setItem('ematch_cache_' + key, JSON.stringify(data)); } catch(_) {}
  },
  get(key) {
    try {
      const d = localStorage.getItem('ematch_cache_' + key);
      return d ? JSON.parse(d) : null;
    } catch(_) { return null; }
  }
};

// ── CACHE INSTANT ──────────────────────────────────────────
function loadCacheInstant() {
  try {
    const cached = localStorage.getItem('ematch_user_cache');
    if (!cached) return;
    const data = JSON.parse(cached);
    if (!data?.uid) return;
    currentUserData         = data;
    window._ematch_uid      = data.uid;
    window._ematch_userdata = data;
    updateHeaderUI();
  } catch (_) {}
}

// ── 3. UTILITIES ───────────────────────────────────────────
function setLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

function showError(fieldId, msg) {
  const field = document.getElementById(fieldId);
  const errEl = document.getElementById(fieldId + '_err');
  if (field) field.classList.add('input-error');
  if (errEl) errEl.textContent = msg;
}

function clearErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.input-error')
      .forEach(el => el.classList.remove('input-error'));
  form.querySelectorAll('.error-msg')
      .forEach(el => el.textContent = '');
}

window.showToast = function(msg, type = 'info') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast';
  const bg = {
    error:   'var(--accent-red)',
    success: 'var(--accent-green)',
    warning: 'var(--accent-gold)',
    info:    'var(--bg-card2)'
  }[type] || 'var(--bg-card2)';
  Object.assign(toast.style, {
    position:    'fixed',
    bottom:      '90px',
    left:        '50%',
    transform:   'translateX(-50%) translateY(20px)',
    background:  bg,
    color:       type === 'success' ? '#000' : '#fff',
    padding:     '10px 20px',
    borderRadius:'var(--r-full)',
    fontSize:    '14px',
    fontWeight:  '600',
    zIndex:      '9999',
    maxWidth:    '360px',
    textAlign:   'center',
    transition:  'all 240ms var(--ease)',
    border:      '1px solid var(--glass-border)',
    boxShadow:   '0 4px 20px rgba(0,0,0,.5)',
    opacity:     '0',
    pointerEvents:'none'
  });
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity   = '1';
  });
  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
};

window.openModal = function(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  history.pushState({ modal: modalId }, '');
  const focusable = overlay.querySelector('input, button, select');
  if (focusable) setTimeout(() => focusable.focus(), 250);
};

window.closeModal = function(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
};

window.handleLogout = handleLogout;

function requireOnline() {
  if (!isOnline) {
    showToast('Xiriirka internetka kuma jirto.', 'error');
    return false;
  }
  return true;
}

const validateEmail    = e  => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const validatePhone    = p  => /^[+]?[0-9]{9,15}$/.test(p.replace(/\s/g,''));
const validatePassword = pw => pw.length >= 8;

// ── 4. OFFLINE ─────────────────────────────────────────────
function updateOnlineStatus() {
  isOnline = navigator.onLine;
  const banner = document.getElementById('offline-banner');
  if (banner) banner.classList.toggle('hidden', isOnline);
}
window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// ── 5. NAVIGATION ──────────────────────────────────────────
function initNavigation() {
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

  document.querySelectorAll('.nav-item').forEach(item => {
    const targetPage = item.dataset.page || item.getAttribute('href');

    if (targetPage === currentPage) {
      item.classList.add('active');
      item.setAttribute('aria-current', 'page');
    }

    if (targetPage === currentPage && item.tagName === 'A') {
      item.addEventListener('click', e => {
        e.preventDefault();
        updateHeaderUI();
        showToast('Hadda boggan ayaad ku jirtaa', 'info');
      });
    }

    let pressTimer;
    const tooltip = item.querySelector('.nav-tooltip');
    item.addEventListener('pointerdown', () => {
      pressTimer = setTimeout(() => {
        if (tooltip) tooltip.classList.add('visible');
      }, 500);
    });
    item.addEventListener('pointerup', () => {
      clearTimeout(pressTimer);
      if (tooltip) setTimeout(() => tooltip.classList.remove('visible'), 900);
    });
    item.addEventListener('pointerleave', () => clearTimeout(pressTimer));
  });

  window.addEventListener('popstate', () => {
    const openModalEl = document.querySelector('.modal-overlay.open');
    if (openModalEl) {
      closeModal(openModalEl.id);
      history.pushState(null, '', window.location.href);
    }
  });
}

// ── 6. AUTH GUARD ──────────────────────────────────────────
function authGuard(requireAuth, redirectTo = 'dashboard.html') {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, async user => {
      unsub();
      if (requireAuth && !user) {
        window.location.replace('index.html');
      } else if (!requireAuth && user) {
        window.location.replace(redirectTo);
      } else if (user) {
        currentUser = user;
        await loadUserData(user.uid);
        resolve(user);
      } else {
        resolve(null);
      }
    });
  });
}

// ── 7. LOAD USER DATA ──────────────────────────────────────
async function loadUserData(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      currentUserData = snap.data();
    } else {
      const user      = auth.currentUser;
      currentUserData = {
        uid,
        fullName:      user?.displayName || 'User',
        email:         user?.email       || '',
        phone:         '',
        role:          'user',
        coinBalance:   0,
        escrowBalance: 0,
        createdAt:     serverTimestamp()
      };
      await setDoc(doc(db, 'users', uid), currentUserData);
    }
    window._ematch_uid      = uid;
    window._ematch_userdata = currentUserData;
    updateHeaderUI();
    try {
      localStorage.setItem('ematch_user_cache', JSON.stringify({
        ...currentUserData,
        createdAt: currentUserData.createdAt?.toDate?.()?.toISOString() || null
      }));
    } catch (_) {}
    return currentUserData;
  } catch (err) {
    console.error('loadUserData:', err);
    try {
      const cached = localStorage.getItem('ematch_user_cache');
      if (cached) {
        currentUserData         = JSON.parse(cached);
        window._ematch_uid      = currentUserData.uid;
        window._ematch_userdata = currentUserData;
        updateHeaderUI();
      }
    } catch (_) {}
  }
}

// ── 8. UPDATE HEADER UI ────────────────────────────────────
function updateHeaderUI() {
  if (!currentUserData) return;
  const initials = (currentUserData.fullName || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.querySelectorAll('.avatar')
    .forEach(a => { a.textContent = initials; });
  document.querySelectorAll('.coin-balance-display')
    .forEach(c => {
      c.textContent = (currentUserData.coinBalance || 0).toLocaleString();
    });
  const adminRoles = ['administrator','owner','partner_manager'];
  if (adminRoles.includes(currentUserData.role)) {
    document.querySelectorAll('.admin-only')
      .forEach(el => el.classList.remove('hidden'));
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.classList.remove('hidden');
  }
}

// ── 9. SIGNUP ──────────────────────────────────────────────
async function handleSignup(e) {
  e.preventDefault();
  if (!requireOnline()) return;
  const fullName = document.getElementById('reg_fullName').value.trim();
  const email    = document.getElementById('reg_email').value.trim();
  const phone    = document.getElementById('reg_phone').value.trim();
  const password = document.getElementById('reg_password').value;
  const btn      = document.getElementById('btn_register');
  clearErrors('register-form');
  let valid = true;
  if (!fullName || fullName.length < 2)
    { showError('reg_fullName','Magaca oo buuxa geli'); valid=false; }
  if (!validateEmail(email))
    { showError('reg_email','Email-ka sax ma ahan'); valid=false; }
  if (!validatePhone(phone))
    { showError('reg_phone','Lambarka sax geli (+252...)'); valid=false; }
  if (!validatePassword(password))
    { showError('reg_password','Ugu yaraan 8 xaraf'); valid=false; }
  if (!valid) return;
  setLoading(btn, true);
  try {
    const cred    = await createUserWithEmailAndPassword(auth, email, password);
    const uid     = cred.user.uid;
    const newUser = {
      uid, fullName, email, phone,
      role:'user', coinBalance:0, escrowBalance:0,
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', uid), newUser);
    try {
      localStorage.setItem('ematch_user_cache', JSON.stringify({
        ...newUser, createdAt: new Date().toISOString()
      }));
    } catch (_) {}
    window.location.replace('dashboard.html');
  } catch (err) {
    setLoading(btn, false);
    const m = {
      'auth/email-already-in-use': ['reg_email',   'Email-kani horey loo isticmaalay'],
      'auth/weak-password':        ['reg_password', 'Password-ku aad ayuu u liita'],
      'auth/invalid-email':        ['reg_email',    'Email-ka foomka sax ma ahan']
    };
    if (m[err.code]) showError(m[err.code][0], m[err.code][1]);
    else showToast('Khalad: ' + err.message, 'error');
  }
}

// ── 10. LOGIN ──────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  if (!requireOnline()) return;
  const email    = document.getElementById('login_email').value.trim();
  const password = document.getElementById('login_password').value;
  const btn      = document.getElementById('btn_login');
  clearErrors('login-form');
  if (!validateEmail(email)) { showError('login_email',   'Email-ka sax ma ahan'); return; }
  if (!password)             { showError('login_password','Password-ka geli');     return; }
  setLoading(btn, true);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (snap.exists()) {
      const data = snap.data();
      try {
        localStorage.setItem('ematch_user_cache', JSON.stringify({
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null
        }));
      } catch (_) {}
    }
    window.location.replace('dashboard.html');
  } catch (err) {
    setLoading(btn, false);
    const bad = ['auth/invalid-credential','auth/user-not-found',
                 'auth/wrong-password','auth/invalid-email'];
    if (bad.includes(err.code))
      showToast('Email ama password-ku khaldan yahay', 'error');
    else
      showToast('Khalad: ' + err.message, 'error');
  }
}

// ── 11. GOOGLE SIGN-IN ─────────────────────────────────────
async function handleGoogleSignIn() {
  if (!requireOnline()) return;
  try {
    const cred    = await signInWithPopup(auth, new GoogleAuthProvider());
    const uid     = cred.user.uid;
    const userRef = doc(db, 'users', uid);
    let   snap    = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid, fullName: cred.user.displayName||'',
        email: cred.user.email||'', phone:'',
        role:'user', coinBalance:0, escrowBalance:0,
        createdAt: serverTimestamp()
      });
      snap = await getDoc(userRef);
    }
    if (snap.exists()) {
      const data = snap.data();
      try {
        localStorage.setItem('ematch_user_cache', JSON.stringify({
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null
        }));
      } catch (_) {}
    }
    window.location.replace('dashboard.html');
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user')
      showToast('Google sign-in khalad: ' + err.message, 'error');
  }
}

// ── 12. PASSWORD RESET ─────────────────────────────────────
window.handlePasswordReset = async function() {
  const emailInput = document.getElementById('login_email');
  const email      = emailInput?.value.trim() || prompt('Email-kaaga geli:');
  if (!email || !validateEmail(email)) { showToast('Email sax ah geli','error'); return; }
  if (!requireOnline()) return;
  try {
    await sendPasswordResetEmail(auth, email);
    showToast('✅ Password reset email la diray','success');
  } catch (err) {
    showToast('Khalad: ' + err.message,'error');
  }
};

// ── 13. LOGOUT ─────────────────────────────────────────────
async function handleLogout() {
  try {
    await signOut(auth);
    localStorage.removeItem('ematch_user_cache');
    window.location.replace('index.html');
  } catch (err) {
    showToast('Khalad: ' + err.message, 'error');
  }
}

// ── 14. PASSWORD TOGGLE ────────────────────────────────────
function initPasswordToggles() {
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap  = btn.closest('.input-wrap');
      const input = wrap?.querySelector('input[type="password"],input[type="text"]');
      if (!input) return;
      const hidden  = input.type === 'password';
      input.type    = hidden ? 'text' : 'password';
      btn.innerHTML = hidden
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
              a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4
              c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07
              a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
           </svg>`;
    });
  });
}

// ── 15. RENDER MATCH CARD ──────────────────────────────────
function renderMatchCard(id, m) {
  const emojiMap = {
    'FIFA':'⚽','FC Mobile':'⚽','eFootball':'⚽',
    'NBA 2K':'🏀','PUBG':'🔫','Free Fire':'🔫','COD':'🔫'
  };
  const emoji  = emojiMap[m.platform] || '🎮';
  const isLive = m.status === 'locked';
  return `
    <div class="match-card" data-id="${id}" role="listitem" tabindex="0">
      <div class="match-card-banner">
        <span>${emoji}</span>
        ${isLive ? '<div class="live-badge">LIVE</div>' : ''}
      </div>
      <div class="match-card-body">
        <div class="match-meta">
          <span class="match-platform-tag">${m.platform||'Unknown'}</span>
          <span class="status-pill ${m.status||'open'}">${
            m.status==='open'?'Furan':m.status==='locked'?'Socda':'Dhammaaday'
          }</span>
        </div>
        <h3>${m.title||m.platform+' Match'}</h3>
        <div class="match-footer">
          <div class="stake-amount">🪙 ${(m.stakeCoins||0).toLocaleString()}</div>
          <span class="players-joined">
            ${m.joinedBy?'2/2 ▶ Socda':'1/2 ⏳ Sugaysa'}
          </span>
        </div>
      </div>
    </div>`;
}

// ── 16. LOAD MATCHES ───────────────────────────────────────
function loadMatches(container, filter = 'all') {
  if (!container) return;

  // ✅ CACHE: Markiiba soo muuji
  const cached = PageCache.get('matches_' + filter);
  if (cached && cached.length > 0) {
    container.innerHTML = cached.map(m => renderMatchCard(m.id, m)).join('');
    container.querySelectorAll('.match-card').forEach(card => {
      card.addEventListener('click', () => openMatchModal(card.dataset.id));
    });
  } else {
    container.innerHTML = Array(3).fill(`
      <div class="card mb-md">
        <div class="skeleton sk-block mb-md"></div>
        <div class="skeleton sk-line" style="width:60%"></div>
        <div class="skeleton sk-line" style="width:80%"></div>
      </div>`).join('');
  }

  const q = filter === 'all'
    ? query(collection(db,'matches'), orderBy('createdAt','desc'), limit(25))
    : query(collection(db,'matches'), where('status','==',filter),
            orderBy('createdAt','desc'), limit(25));

  const unsub = onSnapshot(q, snap => {
    if (snap.empty) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 16px">
          <div style="font-size:48px;margin-bottom:16px">🎮</div>
          <h3>Match la'aan</h3><p>Abuur mid cusub!</p>
        </div>`;
      PageCache.set('matches_' + filter, []);
      return;
    }
    const matchesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    PageCache.set('matches_' + filter, matchesData.map(m => ({
      ...m,
      createdAt: m.createdAt?.toDate?.()?.toISOString() || null
    })));
    container.innerHTML = matchesData.map(m => renderMatchCard(m.id, m)).join('');
    container.querySelectorAll('.match-card').forEach(card => {
      card.addEventListener('click', () => openMatchModal(card.dataset.id));
    });
  }, err => {
    if (!cached) {
      container.innerHTML =
        `<p class="text-center p-md text-muted">Khalad: ${err.message}</p>`;
    }
  });

  return unsub;
}

// ── 17. OPEN MATCH MODAL ───────────────────────────────────
async function openMatchModal(matchId) {
  openModal('match-modal');
  const content = document.getElementById('match-modal-content');
  if (!content) return;
  content.innerHTML = `
    <div class="modal-handle"></div>
    <div class="skeleton sk-block mb-md"></div>
    <div class="skeleton sk-line" style="width:70%"></div>
    <div class="skeleton sk-line" style="width:50%"></div>`;
  try {
    const snap = await getDoc(doc(db, 'matches', matchId));
    if (!snap.exists()) {
      content.innerHTML='<p class="text-muted p-md">Match la ma helin</p>'; return;
    }
    const m       = snap.data();
    const bal     = currentUserData?.coinBalance || 0;
    const canJoin = m.status==='open' && currentUser?.uid!==m.createdBy
                 && !m.joinedBy && bal>=(m.stakeCoins||0);
    const noFunds = m.status==='open' && currentUser?.uid!==m.createdBy
                 && !m.joinedBy && bal<(m.stakeCoins||0);
    content.innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>🎮 ${m.title||m.platform+' Match'}</h2>
        <button class="modal-close" onclick="closeModal('match-modal')" aria-label="Xidh">✕</button>
      </div>
      <div class="match-meta mb-md">
        <span class="match-platform-tag">${m.platform}</span>
        <span class="status-pill ${m.status}">${
          m.status==='open'?'Furan':m.status==='locked'?'🔴 LIVE':'Dhammaaday'
        }</span>
      </div>
      <div class="grid-2 mb-md">
        <div class="card" style="text-align:center;padding:var(--sp-md)">
          <div style="font-size:22px;font-weight:900;color:var(--accent-green)">
            🪙 ${(m.stakeCoins||0).toLocaleString()}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Stake</div>
        </div>
        <div class="card" style="text-align:center;padding:var(--sp-md)">
          <div style="font-size:22px;font-weight:900;color:var(--accent-gold)">
            🪙 ${((m.stakeCoins||0)*2).toLocaleString()}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Prize</div>
        </div>
      </div>
      <div class="card mb-md">
        <div class="flex items-center gap-md" style="justify-content:space-around">
          <div style="text-align:center">
            <div style="width:48px;height:48px;border-radius:50%;
              background:linear-gradient(135deg,var(--accent-green),var(--accent-blue));
              display:flex;align-items:center;justify-content:center;
              font-size:18px;font-weight:900;color:#000;margin:0 auto 6px">
              ${(m.createdBy||'?')[0].toUpperCase()}
            </div>
            <div style="font-size:11px;color:var(--text-muted)">${(m.createdBy||'').slice(0,8)}...</div>
            ${m.winnerId===m.createdBy?'<div style="color:var(--accent-gold)">🏆</div>':''}
          </div>
          <div style="font-size:18px;font-weight:900;color:var(--text-muted)">VS</div>
          <div style="text-align:center">
            ${m.joinedBy ? `
              <div style="width:48px;height:48px;border-radius:50%;
                background:linear-gradient(135deg,var(--accent-red),#dc2626);
                display:flex;align-items:center;justify-content:center;
                font-size:18px;font-weight:900;color:#fff;margin:0 auto 6px">
                ${m.joinedBy[0].toUpperCase()}
              </div>
              <div style="font-size:11px;color:var(--text-muted)">${m.joinedBy.slice(0,8)}...</div>
              ${m.winnerId===m.joinedBy?'<div style="color:var(--accent-gold)">🏆</div>':''}
            ` : `
              <div style="width:48px;height:48px;border-radius:50%;
                background:var(--bg-card2);border:2px dashed var(--border);
                display:flex;align-items:center;justify-content:center;
                font-size:20px;margin:0 auto 6px">⏳</div>
              <div style="font-size:11px;color:var(--text-muted)">Sugaysa...</div>
            `}
          </div>
        </div>
      </div>
      ${canJoin ? `
        <button class="btn btn-primary mt-sm" id="btn_join_match"
          data-id="${matchId}" data-stake="${m.stakeCoins}">
          <span class="btn-text">🎮 Ku Biir — 🪙 ${(m.stakeCoins||0).toLocaleString()}</span>
          <div class="btn-spinner"></div>
        </button>` : ''}
      ${m.status==='open' && currentUser?.uid===m.createdBy ? `
        <div class="card mt-sm" style="background:rgba(0,230,118,.05);
          border-color:rgba(0,230,118,.2);text-align:center">
          <p style="font-size:13px;color:var(--accent-green)">
            ✅ Adaa abuuray — qof kale ayaa la sugayaa
          </p>
        </div>` : ''}
      ${noFunds ? `
        <div class="card mt-sm" style="border-color:rgba(239,68,68,.3);text-align:center">
          <p class="text-red" style="font-size:13px;margin-bottom:8px">💸 Lacag kuma filna</p>
          <a href="wallet.html" class="btn btn-gold btn-sm"
            style="text-decoration:none;width:auto;margin:0 auto">+ Deposit</a>
        </div>` : ''}`;
    const joinBtn = content.querySelector('#btn_join_match');
    if (joinBtn) {
      joinBtn.addEventListener('click', () =>
        joinMatch(matchId, parseInt(joinBtn.dataset.stake)));
    }
  } catch (err) {
    content.innerHTML = `<p class="text-muted p-md">Khalad: ${err.message}</p>`;
  }
}

// ── 18. JOIN MATCH ─────────────────────────────────────────
async function joinMatch(matchId, stakeCoins) {
  if (!requireOnline() || !currentUser) return;
  const btn = document.getElementById('btn_join_match')
           || document.getElementById('btn_join_from_matches');
  if (btn) setLoading(btn, true);
  try {
    await runTransaction(db, async tx => {
      const matchRef = doc(db,'matches',matchId);
      const userRef  = doc(db,'users',currentUser.uid);
      const [mSnap,uSnap] = await Promise.all([tx.get(matchRef),tx.get(userRef)]);
      if (!mSnap.exists()) throw new Error('Match la ma helin');
      const match = mSnap.data();
      const user  = uSnap.data();
      if (match.status!=='open')            throw new Error('Match-ku xidhmay');
      if (match.joinedBy)                    throw new Error('Match-ku buuxay');
      if (match.createdBy===currentUser.uid) throw new Error('Adigu abuuray match-kan');
      if ((user.coinBalance||0)<stakeCoins)  throw new Error('Lacag kuma filna');
      const creatorRef  = doc(db,'users',match.createdBy);
      const creatorSnap = await tx.get(creatorRef);
      const creator     = creatorSnap.data() || {};
      tx.update(matchRef, {joinedBy:currentUser.uid, status:'locked', lockedAt:serverTimestamp()});
      tx.update(userRef,  {coinBalance:(user.coinBalance||0)-stakeCoins, escrowBalance:(user.escrowBalance||0)+stakeCoins});
      if ((creator.coinBalance||0)>=stakeCoins) {
        tx.update(creatorRef, {coinBalance:(creator.coinBalance||0)-stakeCoins, escrowBalance:(creator.escrowBalance||0)+stakeCoins});
      }
      const txRef = doc(collection(db,'transactions'));
      tx.set(txRef, {userId:currentUser.uid, type:'escrow_lock', coins:-stakeCoins,
        relatedMatch:matchId, createdAt:serverTimestamp(), meta:{action:'join',matchId}});
    });
    await loadUserData(currentUser.uid);
    closeModal('match-modal');
    showToast('✅ Match ku biirtay! Ciyaar fiican 🎮','success');
  } catch (err) {
    if (btn) setLoading(btn, false);
    showToast(err.message, 'error');
  }
}
window.joinMatchGlobal = joinMatch;

// ── 19. CREATE MATCH ───────────────────────────────────────
async function handleCreateMatch(e) {
  e.preventDefault();
  if (!requireOnline() || !currentUser) return;
  const platform   = document.getElementById('cm_platform')?.value;
  const stakeCoins = parseInt(document.getElementById('cm_stake')?.value)||0;
  const title      = document.getElementById('cm_title')?.value.trim()||'';
  const btn        = document.getElementById('btn_create_match');
  clearErrors('create-match-form');
  let valid = true;
  if (!platform)                                    { showError('cm_platform','Platform dooro'); valid=false; }
  if (stakeCoins<10)                                { showError('cm_stake','Ugu yaraan 10'); valid=false; }
  if ((currentUserData?.coinBalance||0)<stakeCoins) { showError('cm_stake','Lacag kuma filna'); valid=false; }
  if (!valid) return;
  setLoading(btn, true);
  try {
    await runTransaction(db, async tx => {
      const userRef  = doc(db,'users',currentUser.uid);
      const userSnap = await tx.get(userRef);
      const user     = userSnap.data();
      if ((user.coinBalance||0)<stakeCoins) throw new Error('Lacag kuma filna');
      const matchRef = doc(collection(db,'matches'));
      const matchId  = matchRef.id;
      tx.set(matchRef, {
        id:matchId, title:title||platform+' Match', platform,
        stakeCoins, createdBy:currentUser.uid, joinedBy:null,
        status:'open', winnerId:null, createdAt:serverTimestamp(),
        completedAt:null, lockedAt:null
      });
      tx.update(userRef, {
        coinBalance:(user.coinBalance||0)-stakeCoins,
        escrowBalance:(user.escrowBalance||0)+stakeCoins
      });
      const txRef = doc(collection(db,'transactions'));
      tx.set(txRef, {userId:currentUser.uid, type:'escrow_lock', coins:-stakeCoins,
        relatedMatch:matchId, createdAt:serverTimestamp(), meta:{action:'create',matchId}});
    });
    await loadUserData(currentUser.uid);
    closeModal('create-match-modal');
    showToast('✅ Match la abuuray! 🎮','success');
    ['cm_platform','cm_stake','cm_title'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value='';
    });
  } catch (err) {
    setLoading(btn, false);
    showToast(err.message,'error');
  }
}

// ── 20. DEPOSIT ────────────────────────────────────────────
async function handleDeposit(e) {
  e.preventDefault();
  if (!requireOnline() || !currentUser) return;
  const amount   = parseFloat(document.getElementById('dep_amount')?.value)||0;
  const phone    = document.getElementById('dep_phone')?.value.trim()||'';
  const provider = document.getElementById('dep_provider')?.value||'';
  const btn      = document.getElementById('btn_deposit');
  clearErrors('deposit-form');
  let valid = true;
  if (amount<1||amount>1000) { showError('dep_amount','$1–$1000'); valid=false; }
  if (!validatePhone(phone)) { showError('dep_phone','Lambarka sax geli'); valid=false; }
  if (!provider)             { showError('dep_provider','Provider dooro'); valid=false; }
  if (!valid) return;
  const coinsAmount = Math.floor(amount/0.10);
  const cleanPhone  = phone.replace('+','').replace(/\s/g,'');
  const amtMillis   = Math.round(amount*1000);
  const ussdMap = {
    Hormuud:`*712*${cleanPhone}*${amtMillis}#`,
    Somnet: `*888*1*${cleanPhone}*${amtMillis}#`,
    Somtel: `*668*${cleanPhone}*${amtMillis}#`
  };
  const ussdCode = ussdMap[provider]||`*000*${cleanPhone}*${amtMillis}#`;
  setLoading(btn, true);
  try {
    await addDoc(collection(db,'deposit_requests'), {
      userId:currentUser.uid, amountUSD:amount, coinsAmount,
      phoneSentFrom:phone, company:provider, ussdCode,
      status:'pending', createdAt:serverTimestamp(),
      reviewedBy:null, reviewedAt:null
    });
    setLoading(btn, false);
    const ussdEl = document.getElementById('ussd-code-display');
    const ussdAm = document.getElementById('ussd-amount-display');
    if (ussdEl) ussdEl.textContent = ussdCode;
    if (ussdAm) ussdAm.textContent = `$${amount} → 🪙 ${coinsAmount.toLocaleString()} coins`;
    closeModal('deposit-modal');
    setTimeout(()=>openModal('ussd-modal'),200);
  } catch (err) {
    setLoading(btn, false);
    showToast('Khalad: '+err.message,'error');
  }
}

// ── 21. SEND COINS ─────────────────────────────────────────
async function handleSendCoins(e) {
  e.preventDefault();
  if (!requireOnline() || !currentUser) return;
  const recipientId = document.getElementById('send_recipient')?.value.trim()||'';
  const sendAmount  = parseInt(document.getElementById('send_amount')?.value)||0;
  const btn         = document.getElementById('btn_send_coins');
  clearErrors('send-coins-form');
  let valid = true;
  if (!recipientId)                                { showError('send_recipient','UID-ka geli'); valid=false; }
  if (recipientId===currentUser.uid)               { showError('send_recipient','Adiga nafta'); valid=false; }
  if (sendAmount<1)                                { showError('send_amount','Tiro sax geli'); valid=false; }
  if (sendAmount>(currentUserData?.coinBalance||0)){ showError('send_amount','Lacag kuma filna'); valid=false; }
  if (!valid) return;
  setLoading(btn, true);
  try {
    await runTransaction(db, async tx => {
      const sRef = doc(db,'users',currentUser.uid);
      const rRef = doc(db,'users',recipientId);
      const [sSnap,rSnap] = await Promise.all([tx.get(sRef),tx.get(rRef)]);
      if (!rSnap.exists()) throw new Error('Isticmaalaha la ma helin');
      const sender = sSnap.data();
      if ((sender.coinBalance||0)<sendAmount) throw new Error('Lacag kuma filna');
      tx.update(sRef,{coinBalance:(sender.coinBalance||0)-sendAmount});
      tx.update(rRef,{coinBalance:(rSnap.data().coinBalance||0)+sendAmount});
      const t1=doc(collection(db,'transactions'));
      tx.set(t1,{userId:currentUser.uid,type:'send',coins:-sendAmount,relatedMatch:null,createdAt:serverTimestamp(),meta:{to:recipientId}});
      const t2=doc(collection(db,'transactions'));
      tx.set(t2,{userId:recipientId,type:'receive',coins:+sendAmount,relatedMatch:null,createdAt:serverTimestamp(),meta:{from:currentUser.uid}});
    });
    await loadUserData(currentUser.uid);
    closeModal('send-modal');
    showToast(`✅ 🪙 ${sendAmount.toLocaleString()} la diray!`,'success');
    document.getElementById('send_recipient').value='';
    document.getElementById('send_amount').value='';
  } catch (err) {
    setLoading(btn,false);
    showToast(err.message,'error');
  }
}

// ── 22. TRANSACTION HISTORY ────────────────────────────────
function loadTransactionHistory(container) {
  if (!container || !currentUser) return;
  container.innerHTML = Array(4).fill(`
    <div class="tx-item">
      <div class="skeleton" style="width:40px;height:40px;border-radius:8px;flex-shrink:0"></div>
      <div style="flex:1">
        <div class="skeleton sk-line" style="width:70%"></div>
        <div class="skeleton sk-line" style="width:40%"></div>
      </div>
    </div>`).join('');
  onSnapshot(
    query(collection(db,'transactions'),
      where('userId','==',currentUser.uid),
      orderBy('createdAt','desc'), limit(30)),
    snap => {
      if (snap.empty) {
        container.innerHTML=`<p class="text-center text-muted p-md">Wax transaction ah ma jiro</p>`;
        return;
      }
      const icons  = {deposit_approved:'💰',escrow_lock:'🔒',match_win:'🏆',match_loss:'💸',send:'📤',receive:'📥',refund:'↩️'};
      const labels = {deposit_approved:'Lacag la keenay',escrow_lock:'Match escrow',match_win:'Guul Match',match_loss:'Khasaaro Match',send:'La diray',receive:'La helay',refund:'Dib loo celiyay'};
      container.innerHTML = snap.docs.map(d => {
        const t = d.data();
        const isCredit = t.coins>0;
        const time = t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('so-SO') : 'Dhawaan';
        return `
          <div class="tx-item" role="listitem">
            <div class="tx-icon">${icons[t.type]||'💫'}</div>
            <div class="tx-info">
              <div class="tx-title">${labels[t.type]||t.type}</div>
              <div class="tx-date">${time}</div>
            </div>
            <div class="tx-amount ${isCredit?'credit':'debit'}">
              ${isCredit?'+':''}${(t.coins||0).toLocaleString()} 🪙
            </div>
          </div>`;
      }).join('');
    }
  );
}

// ── 23. ADMIN FUNCTIONS ────────────────────────────────────
function loadDepositRequests(container) {
  if (!container) return;
  if (!['administrator','owner','partner_manager'].includes(currentUserData?.role)) return;
  onSnapshot(
    query(collection(db,'deposit_requests'),
      where('status','==','pending'),
      orderBy('createdAt','desc'), limit(20)),
    snap => {
      if (snap.empty) {
        container.innerHTML=`<p class="text-muted" style="font-size:13px">✅ Pending requests ma jiro</p>`;
        return;
      }
      container.innerHTML = snap.docs.map(d => {
        const r=d.data();
        return `
          <div class="deposit-req-card">
            <div class="deposit-req-meta">
              <span class="deposit-req-coins">🪙 ${(r.coinsAmount||0).toLocaleString()}</span>
              <span class="pending-badge">Sugaysa</span>
            </div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px">
              💵 $${r.amountUSD} · ${r.company} · ${r.phoneSentFrom}
            </div>
            <div style="font-size:11px;color:var(--text-muted);font-family:monospace;margin-bottom:10px;word-break:break-all">
              ${r.ussdCode}
            </div>
            <div class="grid-2">
              <button class="btn btn-primary btn-sm" onclick="adminApproveDeposit('${d.id}','${r.userId}',${r.coinsAmount})">✅ Ogolow</button>
              <button class="btn btn-danger btn-sm"  onclick="adminRejectDeposit('${d.id}')">❌ Diid</button>
            </div>
          </div>`;
      }).join('');
    }
  );
}

window.adminApproveDeposit = async function(reqId, userId, coinsAmount) {
  if (!confirm(`✅ Deposit ogolaan?\n🪙 ${coinsAmount.toLocaleString()}`)) return;
  if (!requireOnline()) return;
  try {
    await runTransaction(db, async tx => {
      const rRef=doc(db,'deposit_requests',reqId);
      const uRef=doc(db,'users',userId);
      const [rSnap,uSnap]=await Promise.all([tx.get(rRef),tx.get(uRef)]);
      if (!rSnap.exists()) throw new Error('Request la ma helin');
      if (rSnap.data().status!=='pending') throw new Error('Horey loo xukumay');
      tx.update(rRef,{status:'approved',reviewedBy:currentUser.uid,reviewedAt:serverTimestamp()});
      tx.update(uRef,{coinBalance:(uSnap.data().coinBalance||0)+coinsAmount});
      const txRef=doc(collection(db,'transactions'));
      tx.set(txRef,{userId,type:'deposit_approved',coins:coinsAmount,relatedMatch:null,
        createdAt:serverTimestamp(),meta:{reqId,approvedBy:currentUser.uid}});
      const log=doc(collection(db,'adminLogs'));
      tx.set(log,{action:'approve_deposit',adminUid:currentUser.uid,
        targetUserId:userId,reqId,coinsAmount,createdAt:serverTimestamp()});
    });
    showToast('✅ Deposit la ogolaaday!','success');
  } catch (err) { showToast('Khalad: '+err.message,'error'); }
};

window.adminRejectDeposit = async function(reqId) {
  if (!confirm('❌ Deposit-kan diidid?')) return;
  if (!requireOnline()) return;
  try {
    await updateDoc(doc(db,'deposit_requests',reqId),{
      status:'rejected', reviewedBy:currentUser.uid, reviewedAt:serverTimestamp()
    });
    showToast('Deposit la diidiy','info');
  } catch (err) { showToast('Khalad: '+err.message,'error'); }
};

window.adminSetWinner = async function(matchId, winnerUid) {
  if (!confirm(`🏆 Winner set garee?\n${winnerUid.slice(0,16)}...`)) return;
  if (!requireOnline()) return;
  try {
    await runTransaction(db, async tx => {
      const mRef  = doc(db,'matches',matchId);
      const mSnap = await tx.get(mRef);
      if (!mSnap.exists()) throw new Error('Match la ma helin');
      const m = mSnap.data();
      if (m.status!=='locked')  throw new Error('Match weli locked ma ahan');
      if (m.winnerId)           throw new Error('Winner horey la dejiyay');
      if (!m.joinedBy)          throw new Error('Labo ciyaartoy ma jiraan');
      const loserUid = winnerUid===m.createdBy ? m.joinedBy : m.createdBy;
      const prize    = (m.stakeCoins||0)*2;
      const wRef=doc(db,'users',winnerUid);
      const lRef=doc(db,'users',loserUid);
      const [wSnap,lSnap]=await Promise.all([tx.get(wRef),tx.get(lRef)]);
      tx.update(mRef,{winnerId:winnerUid,status:'done',completedAt:serverTimestamp()});
      tx.update(wRef,{coinBalance:(wSnap.data().coinBalance||0)+prize, escrowBalance:(wSnap.data().escrowBalance||0)-m.stakeCoins});
      tx.update(lRef,{escrowBalance:(lSnap.data().escrowBalance||0)-m.stakeCoins});
      const t1=doc(collection(db,'transactions'));
      tx.set(t1,{userId:winnerUid,type:'match_win',coins:+prize,relatedMatch:matchId,createdAt:serverTimestamp(),meta:{matchId,loserUid}});
      const t2=doc(collection(db,'transactions'));
      tx.set(t2,{userId:loserUid,type:'match_loss',coins:-m.stakeCoins,relatedMatch:matchId,createdAt:serverTimestamp(),meta:{matchId,winnerUid}});
      const log=doc(collection(db,'adminLogs'));
      tx.set(log,{action:'set_winner',adminUid:currentUser.uid,matchId,winnerUid,loserUid,prize,createdAt:serverTimestamp()});
    });
    showToast('🏆 Winner la dejiyay!','success');
  } catch (err) { showToast('Khalad: '+err.message,'error'); }
};

// ── 24. FILTER CHIPS ───────────────────────────────────────
function initFilterChips(matchesContainer) {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected','false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected','true');
      loadMatches(matchesContainer, chip.dataset.filter||'all');
    });
  });
}

// ── 25. PROFILE STATS ──────────────────────────────────────
async function loadProfileStats(uid) {
  // ✅ CACHE: Markiiba soo muuji
  const cached = PageCache.get('profile_stats_' + uid);
  if (cached) {
    const el = id => document.getElementById(id);
    if (el('stat-coins'))   el('stat-coins').textContent   = (currentUserData?.coinBalance||0).toLocaleString();
    if (el('stat-matches')) el('stat-matches').textContent = cached.totalMatches;
    if (el('stat-wins'))    el('stat-wins').textContent    = cached.totalWins;
    if (el('stat-escrow'))  el('stat-escrow').textContent  = (currentUserData?.escrowBalance||0).toLocaleString();
  }
  try {
    const [cSnap,jSnap,wSnap] = await Promise.all([
      getDocs(query(collection(db,'matches'),where('createdBy','==',uid),limit(50))),
      getDocs(query(collection(db,'matches'),where('joinedBy','==',uid), limit(50))),
      getDocs(query(collection(db,'transactions'),where('userId','==',uid),
               where('type','==','match_win'),limit(100)))
    ]);
    const totalMatches = cSnap.size + jSnap.size;
    const totalWins    = wSnap.size;
    PageCache.set('profile_stats_' + uid, { totalMatches, totalWins });
    const el = id => document.getElementById(id);
    if (el('stat-coins'))   el('stat-coins').textContent   = (currentUserData?.coinBalance||0).toLocaleString();
    if (el('stat-matches')) el('stat-matches').textContent = totalMatches;
    if (el('stat-wins'))    el('stat-wins').textContent    = totalWins;
    if (el('stat-escrow'))  el('stat-escrow').textContent  = (currentUserData?.escrowBalance||0).toLocaleString();
  } catch (err) { console.error('loadProfileStats:',err); }
}

// ── 26. FILL PROFILE UI ────────────────────────────────────
function fillProfileUI() {
  if (!currentUserData) return;
  const u  = currentUserData;
  const el = id => document.getElementById(id);
  const initials = (u.fullName||'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  if (el('profile-name-display'))   el('profile-name-display').textContent   = u.fullName||'—';
  if (el('profile-email-display'))  el('profile-email-display').textContent  = u.email||'—';
  if (el('info-fullname'))          el('info-fullname').textContent           = u.fullName||'—';
  if (el('info-email'))             el('info-email').textContent              = u.email||'—';
  if (el('info-phone'))             el('info-phone').textContent              = u.phone||'La ma gelin';
  if (el('profile-avatar-display')) el('profile-avatar-display').textContent = initials;
  if (el('profile-uid-display'))    el('profile-uid-display').textContent    = 'UID: '+(u.uid||'').slice(0,18)+'...';
  if (el('info-createdat') && u.createdAt?.toDate) {
    el('info-createdat').textContent = u.createdAt.toDate().toLocaleDateString('so-SO');
  }
  const roleConfig = {
    owner:          {cls:'role-badge-owner',  icon:'👑', label:'Owner'},
    administrator:  {cls:'role-badge-admin',  icon:'🛡️', label:'Administrator'},
    partner_manager:{cls:'role-badge-admin',  icon:'🤝', label:'Partner Manager'},
    support:        {cls:'role-badge-support',icon:'🎧', label:'Support'},
    agent:          {cls:'role-badge-support',icon:'📋', label:'Agent'},
    user:           {cls:'role-badge-user',   icon:'👤', label:'User'}
  };
  const cfg   = roleConfig[u.role]||roleConfig.user;
  const badge = el('profile-role-badge');
  if (badge) { badge.className='role-badge '+cfg.cls; badge.textContent=`${cfg.icon} ${cfg.label}`; }
  const editName  = el('edit_fullName');
  const editPhone = el('edit_phone');
  if (editName)  editName.placeholder  = u.fullName||'Magacaaga cusub';
  if (editPhone) editPhone.placeholder = u.phone   ||'+252...';
}

// ── 27. REALTIME USER LISTENER ─────────────────────────────
function startRealtimeUserListener(uid) {
  return onSnapshot(doc(db,'users',uid), snap => {
    if (!snap.exists()) return;
    currentUserData         = snap.data();
    window._ematch_userdata = currentUserData;
    try {
      localStorage.setItem('ematch_user_cache', JSON.stringify({
        ...currentUserData,
        createdAt: currentUserData.createdAt?.toDate?.()?.toISOString()||null
      }));
    } catch (_) {}
    updateHeaderUI();
    const page = window.location.pathname.split('/').pop();
    if (page === 'wallet.html') {
      const bal = currentUserData.coinBalance  ||0;
      const esc = currentUserData.escrowBalance||0;
      const coinsEl  = document.getElementById('wallet-coin-balance');
      const escrowEl = document.getElementById('wallet-escrow-balance');
      const usdEl    = document.getElementById('wallet-usd-equiv');
      if (coinsEl)  coinsEl.textContent  = bal.toLocaleString();
      if (escrowEl) escrowEl.textContent = esc.toLocaleString();
      if (usdEl)    usdEl.textContent    = (bal*0.10).toFixed(2);
    }
    if (page === 'profile.html') {
      fillProfileUI();
      const s = id => document.getElementById(id);
      if (s('stat-coins'))  s('stat-coins').textContent  = (currentUserData.coinBalance  ||0).toLocaleString();
      if (s('stat-escrow')) s('stat-escrow').textContent = (currentUserData.escrowBalance||0).toLocaleString();
    }
  });
}

// ══════════════════════════════════════════════════════════
// ── 28. MAIN DOMContentLoaded ──────────────────────────────
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  loadCacheInstant();

  const page = window.location.pathname.split('/').pop() || 'index.html';

  initNavigation();

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // ════════════════════════════════════════════════════════
  // INDEX.HTML
  // ════════════════════════════════════════════════════════
  if (page === 'index.html' || page === '') {
    await authGuard(false, 'dashboard.html');
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('active'); b.setAttribute('aria-selected','false');
        });
        btn.classList.add('active'); btn.setAttribute('aria-selected','true');
        document.querySelectorAll('.tab-content').forEach(c => {
          c.classList.toggle('hidden', c.dataset.tab !== tab);
        });
      });
    });
    initPasswordToggles();
    document.getElementById('login-form')    ?.addEventListener('submit', handleLogin);
    document.getElementById('register-form') ?.addEventListener('submit', handleSignup);
    document.getElementById('btn_google')    ?.addEventListener('click',  handleGoogleSignIn);
    document.getElementById('btn_forgot_pw') ?.addEventListener('click',  window.handlePasswordReset);
  }

  // ════════════════════════════════════════════════════════
  // DASHBOARD.HTML
  // ════════════════════════════════════════════════════════
  if (page === 'dashboard.html') {
    await authGuard(true);
    startRealtimeUserListener(currentUser.uid);
    const matchesContainer = document.getElementById('matches-list');
    loadMatches(matchesContainer, 'all');
    initFilterChips(matchesContainer);
    document.getElementById('btn_open_create')
      ?.addEventListener('click', () => openModal('create-match-modal'));
    document.getElementById('create-match-form')
      ?.addEventListener('submit', handleCreateMatch);
    document.getElementById('btn_logout')
      ?.addEventListener('click', handleLogout);
    loadDepositRequests(document.getElementById('admin-deposits-container'));
    const pendingJoin = localStorage.getItem('pending_join');
    if (pendingJoin) {
      localStorage.removeItem('pending_join');
      setTimeout(() => openMatchModal(pendingJoin), 600);
    }
    if (localStorage.getItem('open_create')==='1') {
      localStorage.removeItem('open_create');
      setTimeout(() => openModal('create-match-modal'), 400);
    }
  }

  // ════════════════════════════════════════════════════════
  // WALLET.HTML
  // ════════════════════════════════════════════════════════
  if (page === 'wallet.html') {
    await authGuard(true);
    startRealtimeUserListener(currentUser.uid);
    loadTransactionHistory(document.getElementById('tx-list'));
    document.getElementById('btn_open_deposit')
      ?.addEventListener('click', () => openModal('deposit-modal'));
    document.getElementById('deposit-form')
      ?.addEventListener('submit', handleDeposit);
    document.getElementById('btn_open_send')
      ?.addEventListener('click', () => openModal('send-modal'));
    document.getElementById('send-coins-form')
      ?.addEventListener('submit', handleSendCoins);
    document.getElementById('btn_logout')
      ?.addEventListener('click', handleLogout);
    document.getElementById('dep_amount')?.addEventListener('input', function() {
      const coins = Math.floor((parseFloat(this.value)||0)/0.10);
      const p = document.getElementById('dep_preview_coins');
      const h = document.getElementById('dep_coins_preview');
      if (p) p.textContent = coins>0 ? coins.toLocaleString() : '—';
      if (h) h.textContent = coins>0 ? `🪙 ${coins.toLocaleString()} coins la helayaa` : '🪙 Coins la helayo: —';
    });
    document.getElementById('btn_copy_ussd')?.addEventListener('click', () => {
      const code = document.getElementById('ussd-code-display')?.textContent;
      if (code) navigator.clipboard.writeText(code)
        .then(()=>showToast('✅ USSD code la koobiyay','success'))
        .catch(()=>showToast('Koobiyaynta waa fashilantay','error'));
    });
  }

  // ════════════════════════════════════════════════════════
  // PROFILE.HTML
  // ════════════════════════════════════════════════════════
  if (page === 'profile.html') {
    await authGuard(true);
    startRealtimeUserListener(currentUser.uid);
    fillProfileUI();
    await loadProfileStats(currentUser.uid);
    document.getElementById('btn_logout')
      ?.addEventListener('click', handleLogout);
    document.getElementById('edit-profile-form')
      ?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const newName  = document.getElementById('edit_fullName')?.value.trim();
        const newPhone = document.getElementById('edit_phone')?.value.trim();
        const btn      = document.getElementById('btn_save_profile');
        document.getElementById('edit_fullName_err').textContent='';
        document.getElementById('edit_phone_err').textContent='';
        let valid=true;
        if (newName  && newName.length<2)      { document.getElementById('edit_fullName_err').textContent='Ugu yaraan 2 xaraf'; valid=false; }
        if (newPhone && !validatePhone(newPhone)){ document.getElementById('edit_phone_err').textContent='Lambarka sax ma ahan'; valid=false; }
        if (!newName && !newPhone) { showToast('Wax bedel ah geli','error'); return; }
        if (!valid || !requireOnline()) return;
        setLoading(btn, true);
        try {
          const updates={};
          if (newName)  updates.fullName=newName;
          if (newPhone) updates.phone=newPhone;
          await updateDoc(doc(db,'users',currentUser.uid), updates);
          Object.assign(currentUserData, updates);
          window._ematch_userdata=currentUserData;
          fillProfileUI();
          updateHeaderUI();
          if (document.getElementById('edit_fullName')) document.getElementById('edit_fullName').value='';
          if (document.getElementById('edit_phone'))    document.getElementById('edit_phone').value='';
          showToast('✅ Xogta waa la keydiyay!','success');
        } catch (err) {
          showToast('Khalad: '+err.message,'error');
        } finally {
          setLoading(btn,false);
        }
      });
    document.getElementById('menu_reset_pw')?.addEventListener('click', async () => {
      const email = currentUserData?.email;
      if (!email) { showToast('Email la ma helin','error'); return; }
      if (!requireOnline()) return;
      try {
        await sendPasswordResetEmail(auth, email);
        showToast('✅ Password reset email la diray!','success');
      } catch (err) { showToast('Khalad: '+err.message,'error'); }
    });
    document.getElementById('menu_share')?.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({title:'eMatch',text:'Kaalay eMatch! 🎮',url:window.location.origin}).catch(()=>{});
      } else {
        navigator.clipboard.writeText(window.location.origin)
          .then(()=>showToast('✅ Link la koobiyay!','success'));
      }
    });
    document.getElementById('menu_about')
      ?.addEventListener('click', () => openModal('about-modal'));
    window.copyUID = function() {
      const uid = currentUser?.uid;
      if (uid) navigator.clipboard.writeText(uid)
        .then(()=>showToast('✅ UID la koobiyay!','success'))
        .catch(()=>showToast('Koobiyaynta waa fashilantay','error'));
    };
  }

  // ════════════════════════════════════════════════════════
  // MATCHES.HTML
  // ════════════════════════════════════════════════════════
  if (page === 'matches.html') {
    await authGuard(true);
    startRealtimeUserListener(currentUser.uid);

    let allMatchesData = [];
    let mFilter        = 'all';
    let mPlatform      = 'all';
    let mSort          = 'newest';
    let mSearch        = '';
    let matchesUnsub   = null;

    const platformEmoji = {
      'FIFA':'⚽','FC Mobile':'⚽','eFootball':'⚽',
      'NBA 2K':'🏀','PUBG':'🔫','Free Fire':'🔫','COD':'🔫'
    };

    function renderListItem(m) {
      const emoji  = platformEmoji[m.platform] || '🎮';
      const isLive = m.status === 'locked';
      const isDone = m.status === 'done';
      const time   = m.createdAt?.toDate
        ? m.createdAt.toDate().toLocaleDateString('so-SO') : 'Dhawaan';
      return `
        <div class="match-list-item" data-id="${m.id}" role="listitem" tabindex="0">
          <div class="match-list-icon">
            ${emoji}
            ${isLive ? `<div style="position:absolute;top:4px;right:4px;width:8px;height:8px;
              background:var(--accent-red);border-radius:50%;
              animation:pulse 1.2s ease-in-out infinite"></div>` : ''}
          </div>
          <div class="match-list-info">
            <div class="match-list-title">${m.title||m.platform+' Match'}</div>
            <div class="match-list-meta">
              <span class="match-platform-tag">${m.platform}</span>
              <span class="status-pill ${m.status||'open'}">${
                m.status==='open'?'Furan':m.status==='locked'?'🔴 LIVE':
                m.status==='done'?'Dhammaaday':m.status
              }</span>
              ${isDone && m.winnerId
                ? `<span style="font-size:10px;color:var(--accent-gold)">🏆</span>` : ''}
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">
              ${m.joinedBy?'2/2 ▶ Socda':'1/2 ⏳ Sugaysa'} · ${time}
            </div>
          </div>
          <div class="match-list-right">
            <span class="match-stake-big">🪙${(m.stakeCoins||0).toLocaleString()}</span>
            <span style="font-size:10px;color:var(--text-muted)">
              🏆 ${((m.stakeCoins||0)*2).toLocaleString()}
            </span>
          </div>
        </div>`;
    }

    function getFiltered() {
      let list = [...allMatchesData];
      if (mFilter !== 'all')   list = list.filter(m => m.status   === mFilter);
      if (mPlatform !== 'all') list = list.filter(m => m.platform === mPlatform);
      if (mSearch) {
        list = list.filter(m =>
          (m.platform||'').toLowerCase().includes(mSearch) ||
          (m.title   ||'').toLowerCase().includes(mSearch)
        );
      }
      list.sort((a,b) => {
        if (mSort==='newest')     return (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0);
        if (mSort==='oldest')     return (a.createdAt?.seconds||0)-(b.createdAt?.seconds||0);
        if (mSort==='stake-high') return (b.stakeCoins||0)-(a.stakeCoins||0);
        if (mSort==='stake-low')  return (a.stakeCoins||0)-(b.stakeCoins||0);
        return 0;
      });
      return list;
    }

    function renderMatchesList() {
      const list      = getFiltered();
      const container = document.getElementById('matches-full-list');
      const countEl   = document.getElementById('visible-count');
      if (countEl) countEl.textContent = list.length;
      if (!container) return;
      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="icon">🎮</div>
            <h3>${mSearch?'Natiijo la\'aan':'Match la\'aan'}</h3>
            <p>${mSearch?'"'+mSearch+'" lama helin':'Abuur mid cusub!'}</p>
          </div>`;
        return;
      }
      container.innerHTML = list.map(m => renderListItem(m)).join('');
      container.querySelectorAll('.match-list-item').forEach(item => {
        item.addEventListener('click', () => openMatchModalFull(item.dataset.id));
      });
    }

    function updateStats() {
      const open   = allMatchesData.filter(m=>m.status==='open').length;
      const locked = allMatchesData.filter(m=>m.status==='locked').length;
      const done   = allMatchesData.filter(m=>m.status==='done').length;
      const total  = allMatchesData.length;
      const pool   = allMatchesData.filter(m=>m.status!=='done')
                       .reduce((s,m)=>s+(m.stakeCoins||0),0);
      const el = id => document.getElementById(id);
      if (el('count-open'))        el('count-open').textContent        = open;
      if (el('count-locked'))      el('count-locked').textContent      = locked;
      if (el('count-done'))        el('count-done').textContent        = done;
      if (el('count-all'))         el('count-all').textContent         = total;
      if (el('live-count'))        el('live-count').textContent        = locked;
      if (el('prize-pool-number')) el('prize-pool-number').textContent = pool.toLocaleString();
    }

    async function openMatchModalFull(matchId) {
      openModal('match-modal');
      const content = document.getElementById('match-modal-content');
      if (!content) return;
      content.innerHTML = `
        <div class="modal-handle"></div>
        <div class="skeleton sk-block mb-md"></div>
        <div class="skeleton sk-line" style="width:70%"></div>
        <div class="skeleton sk-line" style="width:50%"></div>`;
      try {
        const snap = await getDoc(doc(db,'matches',matchId));
        if (!snap.exists()) {
          content.innerHTML='<p class="text-muted p-md">Match la ma helin</p>'; return;
        }
        const m       = snap.data();
        const bal     = currentUserData?.coinBalance||0;
        const canJoin = m.status==='open' && currentUser.uid!==m.createdBy
                     && !m.joinedBy && bal>=(m.stakeCoins||0);
        const noFunds = m.status==='open' && currentUser.uid!==m.createdBy
                     && !m.joinedBy && bal<(m.stakeCoins||0);
        content.innerHTML = `
          <div class="modal-handle"></div>
          <div class="modal-header">
            <h2>${platformEmoji[m.platform]||'🎮'} ${m.title||m.platform+' Match'}</h2>
            <button class="modal-close" onclick="closeModal('match-modal')" aria-label="Xidh">✕</button>
          </div>
          <div class="match-meta mb-md">
            <span class="match-platform-tag">${m.platform}</span>
            <span class="status-pill ${m.status}">${
              m.status==='open'?'Furan':m.status==='locked'?'🔴 LIVE':'Dhammaaday'
            }</span>
          </div>
          <div class="grid-2 mb-md">
            <div class="card" style="text-align:center;padding:var(--sp-md)">
              <div style="font-size:22px;font-weight:900;color:var(--accent-green)">
                🪙 ${(m.stakeCoins||0).toLocaleString()}
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Stake</div>
            </div>
            <div class="card" style="text-align:center;padding:var(--sp-md)">
              <div style="font-size:22px;font-weight:900;color:var(--accent-gold)">
                🪙 ${((m.stakeCoins||0)*2).toLocaleString()}
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Prize</div>
            </div>
          </div>
          <div class="card mb-md">
            <div class="flex items-center gap-md" style="justify-content:space-around">
              <div style="text-align:center">
                <div style="width:48px;height:48px;border-radius:50%;
                  background:linear-gradient(135deg,var(--accent-green),var(--accent-blue));
                  display:flex;align-items:center;justify-content:center;
                  font-size:18px;font-weight:900;color:#000;margin:0 auto 6px">
                  ${(m.createdBy||'?')[0].toUpperCase()}
                </div>
                <div style="font-size:11px;color:var(--text-muted)">${(m.createdBy||'').slice(0,8)}...</div>
                ${m.winnerId===m.createdBy?'<div style="color:var(--accent-gold);margin-top:2px">🏆</div>':''}
              </div>
              <div style="font-size:18px;font-weight:900;color:var(--text-muted)">VS</div>
              <div style="text-align:center">
                ${m.joinedBy ? `
                  <div style="width:48px;height:48px;border-radius:50%;
                    background:linear-gradient(135deg,var(--accent-red),#dc2626);
                    display:flex;align-items:center;justify-content:center;
                    font-size:18px;font-weight:900;color:#fff;margin:0 auto 6px">
                    ${m.joinedBy[0].toUpperCase()}
                  </div>
                  <div style="font-size:11px;color:var(--text-muted)">${m.joinedBy.slice(0,8)}...</div>
                  ${m.winnerId===m.joinedBy?'<div style="color:var(--accent-gold);margin-top:2px">🏆</div>':''}
                ` : `
                  <div style="width:48px;height:48px;border-radius:50%;
                    background:var(--bg-card2);border:2px dashed var(--border);
                    display:flex;align-items:center;justify-content:center;
                    font-size:20px;margin:0 auto 6px">⏳</div>
                  <div style="font-size:11px;color:var(--text-muted)">Sugaysa...</div>
                `}
              </div>
            </div>
          </div>
          ${canJoin ? `
            <button class="btn btn-primary" id="btn_join_from_matches"
              data-id="${matchId}" data-stake="${m.stakeCoins}">
              <span class="btn-text">🎮 Ku Biir — 🪙 ${(m.stakeCoins||0).toLocaleString()}</span>
              <div class="btn-spinner"></div>
            </button>` : ''}
          ${m.status==='open' && currentUser.uid===m.createdBy ? `
            <div class="card mt-sm" style="background:rgba(0,230,118,.05);
              border-color:rgba(0,230,118,.2);text-align:center">
              <p style="font-size:13px;color:var(--accent-green)">
                ✅ Adaa abuuray — qof kale ayaa la sugayaa
              </p>
            </div>` : ''}
          ${noFunds ? `
            <div class="card mt-sm" style="border-color:rgba(239,68,68,.3);text-align:center">
              <p class="text-red" style="font-size:13px;margin-bottom:8px">💸 Lacag kuma filna</p>
              <a href="wallet.html" class="btn btn-gold btn-sm"
                style="text-decoration:none;width:auto;margin:0 auto">+ Deposit</a>
            </div>` : ''}`;
        const joinBtn = content.querySelector('#btn_join_from_matches');
        if (joinBtn) {
          joinBtn.addEventListener('click', async () => {
            await joinMatch(matchId, parseInt(joinBtn.dataset.stake));
            openMatchModalFull(matchId);
          });
        }
      } catch (err) {
        content.innerHTML = `<p class="text-muted p-md">Khalad: ${err.message}</p>`;
      }
    }

    // ── Start real-time matches listener ────────────────
    function startMatchesListener() {
      if (matchesUnsub) matchesUnsub();

      const cached = PageCache.get('all_matches_full');
      if (cached && cached.length > 0) {
        allMatchesData = cached.map(m => ({
          ...m,
          createdAt: m.createdAt
            ? {
                toDate:  () => new Date(m.createdAt),
                seconds: new Date(m.createdAt).getTime() / 1000
              }
            : null
        }));
        updateStats();
        renderMatchesList();
      }

      const q = query(
        collection(db, 'matches'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      matchesUnsub = onSnapshot(q, snap => {
        allMatchesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        PageCache.set('all_matches_full', allMatchesData.map(m => ({
          ...m,
          createdAt: m.createdAt?.toDate?.()?.toISOString() || null
        })));
        updateStats();
        renderMatchesList();
      }, err => {
        const c = document.getElementById('matches-full-list');
        if (c && allMatchesData.length === 0) {
          c.innerHTML = `
            <div class="empty-state">
              <div class="icon">❌</div>
              <p>${err.message}</p>
            </div>`;
        }
      });
    }

    // ── Event listeners ─────────────────────────────────
    document.getElementById('matches-search')
      ?.addEventListener('input', function() {
        mSearch = this.value.toLowerCase().trim();
        renderMatchesList();
      });

    document.getElementById('sort-select')
      ?.addEventListener('change', function() {
        mSort = this.value;
        renderMatchesList();
      });

    document.querySelectorAll('.platform-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mPlatform = btn.dataset.platform;
        renderMatchesList();
      });
    });

    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected','false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-selected','true');
        mFilter = chip.dataset.filter;
        renderMatchesList();
      });
    });

    window.matchesPageSetFilter = function(status) {
      mFilter = status;
      document.querySelectorAll('.filter-chip').forEach(c => {
        const active = c.dataset.filter === status;
        c.classList.toggle('active', active);
        c.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      renderMatchesList();
    };

    document.querySelectorAll('.modal-overlay').forEach(o => {
      o.addEventListener('click', e => {
        if (e.target === o) closeModal(o.id);
      });
    });

    // ── Start! ──────────────────────────────────────────
    startMatchesListener();
  }

});
