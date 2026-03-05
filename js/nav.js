// ============================================================
// eMatch — js/nav.js  (Navigation Component)
// ============================================================

(function() {

  // ── Get current page ──────────────────────────────────────
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

  // ── Nav HTML ──────────────────────────────────────────────
  function buildNav() {
    const items = [
      {
        page: 'dashboard.html',
        href: 'dashboard.html',
        label: 'Home',
        onclick: '',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                 <polyline points="9 22 9 12 15 12 15 22"/>
               </svg>`
      },
      {
        page: 'matches.html',
        href: 'matches.html',
        label: 'Matches',
        onclick: '',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2">
                 <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                 <line x1="8" y1="21" x2="16" y2="21"/>
                 <line x1="12" y1="17" x2="12" y2="21"/>
               </svg>`
      },
      {
        page: '',
        href: 'dashboard.html',
        label: 'Abuur',
        isCreate: true,
        onclick: currentPage === 'dashboard.html'
          ? `event.preventDefault(); if(window.openModal) openModal('create-match-modal');`
          : `localStorage.setItem('open_create','1')`,
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                 <line x1="12" y1="5" x2="12" y2="19"/>
                 <line x1="5"  y1="12" x2="19" y2="12"/>
               </svg>`
      },
      {
        page: 'wallet.html',
        href: 'wallet.html',
        label: 'Wallet',
        onclick: '',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M20 12V22H4V12"/>
                 <path d="M22 7H2v5h20V7z"/>
                 <path d="M12 22V7"/>
                 <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                 <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
               </svg>`
      },
      {
        page: 'profile.html',
        href: 'profile.html',
        label: 'Profile',
        onclick: '',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                 <circle cx="12" cy="7" r="4"/>
               </svg>`
      }
    ];

    const html = items.map(item => {
      const isActive = item.page && item.page === currentPage;
      const isSamePage = item.page === currentPage;

      if (item.isCreate) {
        return `
          <a class="nav-item create-btn"
            href="${item.href}"
            onclick="${item.onclick}"
            aria-label="Match abuur">
            <div class="nav-icon-wrap">${item.icon}</div>
            <span>${item.label}</span>
          </a>`;
      }

      const clickHandler = isSamePage
        ? `event.preventDefault(); if(window._navRefresh) window._navRefresh();`
        : '';

      return `
        <a class="nav-item${isActive ? ' active' : ''}"
          data-page="${item.page}"
          href="${item.href}"
          ${isActive ? 'aria-current="page"' : ''}
          ${clickHandler ? `onclick="${clickHandler}"` : ''}
          aria-label="${item.label}">
          ${item.icon}
          <span>${item.label}</span>
        </a>`;
    }).join('');

    return `<nav class="bottom-nav" role="navigation" aria-label="Main navigation">${html}</nav>`;
  }

  // ── Inject nav ────────────────────────────────────────────
  function injectNav() {
    // Remove existing nav if any
    const existing = document.querySelector('.bottom-nav');
    if (existing) existing.remove();

    // Inject at end of #app or body
    const app = document.getElementById('app') || document.body;
    app.insertAdjacentHTML('beforeend', buildNav());
  }

  // ── Load coins from cache instantly ───────────────────────
  function loadNavCache() {
    try {
      const cached = localStorage.getItem('ematch_user_cache');
      if (!cached) return;
      const data = JSON.parse(cached);
      if (!data) return;

      // Update all coin displays in header
      const coins = (data.coinBalance || 0).toLocaleString();
      document.querySelectorAll('.coin-balance-display').forEach(el => {
        el.textContent = coins;
      });

      // Update avatar
      const fullName = data.fullName || data.displayName || 'U';
      const initials = fullName
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

      document.querySelectorAll('.avatar').forEach(el => {
        el.textContent = initials;
      });

    } catch (_) {}
  }

  // ── Same-page refresh handler ─────────────────────────────
  window._navRefresh = function() {
    loadNavCache();
    if (window.showToast) showToast('Hadda boggan ayaad ku jirtaa', 'info');
  };

  // ── Run immediately ───────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectNav();
      loadNavCache();
      // Retry for Netlify latency
      setTimeout(loadNavCache, 300);
      setTimeout(loadNavCache, 800);
      setTimeout(loadNavCache, 1500);
    });
  } else {
    injectNav();
    loadNavCache();
    setTimeout(loadNavCache, 300);
    setTimeout(loadNavCache, 800);
    setTimeout(loadNavCache, 1500);
  }

})();
