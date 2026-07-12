/* Premium Ecommerce Toast System (production-ready)
   Global API: Toast.show(type, message, { durationMs })
   Type: 'success' | 'error' | 'info'
*/

(function (global) {
  const rootId = 'bb-toast-root';
  const MAX_TOASTS = 3;

  const icons = {
    success: `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16.6 5.8L8.5 13.9L3.4 8.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    error: `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 6L14 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M14 6L6 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </svg>`,
    info: `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.9"/>
        <path d="M10 9V14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 6.2V6.25" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
      </svg>`
  };

  const defaults = {
    durationMs: 3200,
    titleMap: {
      success: 'Success',
      error: 'Something went wrong',
      info: 'Info'
    }
  };

  let activeCount = 0;

  function ensureRoot() {
    let el = document.getElementById(rootId);
    if (!el) {
      el = document.createElement('div');
      el.id = rootId;
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function hideEl(toastEl) {
    if (!toastEl || toastEl.__bbIsHiding) return;
    toastEl.__bbIsHiding = true;

    toastEl.classList.remove('bb-show');
    toastEl.classList.add('bb-hide');

    const ms = 420;
    window.setTimeout(() => {
      try {
        toastEl.remove();
      } catch (_) {}
      activeCount = Math.max(0, activeCount - 1);
    }, ms);
  }

  function createToast(type, message, durationMs) {
    const toast = document.createElement('div');
    toast.className = `bb-toast bb-${type}`;
    toast.setAttribute('role', 'status');

    const title = defaults.titleMap[type] || 'Notification';
    const iconMarkup = icons[type] || icons.info;

    toast.innerHTML = `
      <div class="bb-toast__inner">
        <div class="bb-toast__icon">
          ${iconMarkup}
        </div>
        <div>
          <div class="bb-toast__title">${escapeHtml(title)}</div>
          <div class="bb-toast__message">${escapeHtml(message || '')}</div>
        </div>
      </div>
      <div class="bb-toast__bar" aria-hidden="true"><span></span></div>
    `;

    const barSpan = toast.querySelector('.bb-toast__bar > span');
    const ms = clamp(durationMs, 1200, 8000);
    barSpan.style.transition = `transform ${ms}ms linear`;
    return { toast, ms };
  }

  function show(type, message, options = {}) {
    type = String(type || 'info').toLowerCase();
    if (!icons[type]) type = 'info';

    const durationMs = (options && typeof options.durationMs === 'number')
      ? options.durationMs
      : defaults.durationMs;

    const root = ensureRoot();

    if (activeCount >= MAX_TOASTS) {
      const first = root.querySelector('.bb-toast');
      if (first) hideEl(first);
    }

    const { toast, ms } = createToast(type, message, durationMs);
    activeCount++;

    root.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('bb-show');
      const barSpan = toast.querySelector('.bb-toast__bar > span');
      if (barSpan) barSpan.style.transform = 'scaleX(1)';
    });

    // Start bar full -> empty
    const barSpan = toast.querySelector('.bb-toast__bar > span');
    if (barSpan) {
      // Start at full (scaleX(1)), then animate to 0
      barSpan.style.transform = 'scaleX(1)';
      requestAnimationFrame(() => {
        barSpan.style.transform = 'scaleX(0)';
      });
    }

    toast.__bbDismissTimer = window.setTimeout(() => hideEl(toast), ms);
    return toast;
  }

  global.Toast = {
    show,
    success: (msg, options) => show('success', msg, options),
    error: (msg, options) => show('error', msg, options),
    info: (msg, options) => show('info', msg, options)
  };
})(window);

