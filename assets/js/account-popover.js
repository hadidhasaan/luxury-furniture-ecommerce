(function () {
  'use strict';

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function getFocusable(container) {
    const candidates = qsa(
      'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), ' +
        'input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), ' +
        '[tabindex]:not([tabindex="-1"])',
      container
    );

    return candidates.filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = qs('#accountToggle');
    const dropdown = qs('#accountDropdown');
    if (!toggleBtn || !dropdown) return;

    const panel = qs('.account-dropdown__panel', dropdown) || dropdown;

    let isOpen = false;
    let lastFocus = null;

    const setOpen = (next) => {
      if (next === isOpen) return;
      isOpen = next;

      dropdown.setAttribute('aria-hidden', next ? 'false' : 'true');
      toggleBtn.setAttribute('aria-expanded', next ? 'true' : 'false');

      if (next) {
        lastFocus = document.activeElement;
        // Focus first actionable item inside dropdown
        const focusables = getFocusable(dropdown);
        const target = focusables[0];
        if (target && typeof target.focus === 'function') target.focus();
        else if (panel && typeof panel.focus === 'function') panel.focus();
      } else {
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
      }
    };

    const toggle = () => setOpen(!isOpen);
    const close = () => setOpen(false);

    // Toggle dropdown on icon click
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });

    // Prevent outside click handler from immediately closing when interacting inside
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Outside click closes
    document.addEventListener('click', () => {
      if (isOpen) close();
    });

    // ESC closes + basic Tab loop
    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = getFocusable(dropdown);
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === first || !dropdown.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    });

    // Keyboard open: Enter/Space when focused on the icon
    toggleBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    /* ---------------- Dark mode toggle (inside this dropdown) ---------------- */
    const THEME_KEY = 'nexora-theme';
    const themeSwitch = qs('#themeToggle', dropdown);

    if (themeSwitch) {
      const isDark = () => document.documentElement.classList.contains('theme-dark');
      themeSwitch.setAttribute('aria-checked', isDark() ? 'true' : 'false');

      const applyTheme = (dark) => {
        document.documentElement.classList.toggle('theme-dark', dark);
        themeSwitch.setAttribute('aria-checked', dark ? 'true' : 'false');
        try {
          localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
        } catch (err) {
          /* localStorage unavailable (private mode etc.) — theme still applies for this visit */
        }
      };

      themeSwitch.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = !isDark();

        // Smooth cross-fade if the browser supports View Transitions;
        // falls back to the CSS background/color transition in style.css.
        if (document.startViewTransition) {
          document.startViewTransition(() => applyTheme(next));
        } else {
          applyTheme(next);
        }
      });
    }
  });
})();


