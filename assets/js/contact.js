/* =====================================================
   NEXORA — Contact page behavior
   - Scoped to contact-* elements
   - Vanilla JS only
   - No backend calls
===================================================== */

(function () {
  'use strict';

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }
  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  // -----------------------------------------------------
  // FAQ Accordion (accessible)
  // -----------------------------------------------------
  function initFaq() {
    var accordions = $all('[data-accordion].contact-accordion, .contact-accordion[data-accordion]');

    accordions.forEach(function (acc) {
      var btn = $('.contact-accordion__btn', acc);
      // Our HTML uses .contact-accordion__btn on the button inside h3
      // but class is on the button itself. Keep resilient lookup.
      if (!btn) {
        btn = acc.querySelector('button[aria-controls]');
      }
      if (!btn) return;

      var panelId = btn.getAttribute('aria-controls');
      var panel = panelId ? $('#' + panelId) : null;
      if (!panel) return;

      // Initialize state
      acc.dataset.open = acc.dataset.open === 'true' ? 'true' : 'false';

      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        setOpen(!isOpen, acc, btn, panel);
      });

      // Allow keyboard activation already handled by button
    });

    function setOpen(open, acc, btn, panel) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        panel.hidden = false;
        acc.dataset.open = 'true';
      } else {
        panel.hidden = true;
        acc.dataset.open = 'false';
      }
    }

    // Ensure initial hidden panels align with aria-expanded
    accordions.forEach(function (acc) {
      var btn = $('.contact-accordion__btn', acc) || acc.querySelector('button[aria-controls]');
      if (!btn) return;
      var panelId = btn.getAttribute('aria-controls');
      var panel = panelId ? $('#' + panelId) : null;
      if (!panel) return;

      var open = btn.getAttribute('aria-expanded') === 'true';
      if (!open) {
        panel.hidden = true;
        acc.dataset.open = 'false';
      } else {
        panel.hidden = false;
        acc.dataset.open = 'true';
      }
    });
  }

  // -----------------------------------------------------
  // Contact form UX + lightweight validation
  // -----------------------------------------------------
  function initForm() {
    var form = $('#contactFormEl');
    if (!form) return;

    var statusWrap = $('#contactFormStatus');
    var statusText = $('#contactFormStatusText');

    var clearBtn = $('#contactFormClear');

    var nameEl = $('#contactName');
    var emailEl = $('#contactEmail');
    var subjectEl = $('#contactSubject');
    var messageEl = $('#contactMessage');

    var fields = [nameEl, emailEl, subjectEl, messageEl].filter(Boolean);

    function setError(el, hasError) {
      if (!el) return;
      if (hasError) el.classList.add('is-error');
      else el.classList.remove('is-error');
    }

    function isValidEmail(value) {
      // Simple, production-safe check (no regex denial-of-service)
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
    }

    function validate() {
      var ok = true;

      var nameVal = nameEl ? nameEl.value.trim() : '';
      var emailVal = emailEl ? emailEl.value.trim() : '';
      var subjectVal = subjectEl ? subjectEl.value.trim() : '';
      var messageVal = messageEl ? messageEl.value.trim() : '';

      setError(nameEl, nameVal.length < 2);
      if (nameVal.length < 2) ok = false;

      setError(emailEl, !isValidEmail(emailVal));
      if (!isValidEmail(emailVal)) ok = false;

      setError(subjectEl, subjectVal.length < 3);
      if (subjectVal.length < 3) ok = false;

      setError(messageEl, messageVal.length < 10);
      if (messageVal.length < 10) ok = false;

      return ok;
    }

    function showStatus(message) {
      if (!statusWrap || !statusText) return;
      statusText.textContent = message;
      statusWrap.hidden = false;
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        fields.forEach(function (el) {
          if (!el) return;
          el.value = '';
          setError(el, false);
        });
        if (statusWrap) statusWrap.hidden = true;
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validate()) {
        showStatus('Please review the highlighted fields and try again.');
        return;
      }

      // Simulate success UX (no backend)
      fields.forEach(function (el) {
        if (!el) return;
      });

      showStatus('Message sent. Our concierge will respond shortly.');

      // Optional: keep values; but premium UX usually clears.
      // Clear after showing status.
      setTimeout(function () {
        fields.forEach(function (el) {
          if (!el) return;
          el.value = '';
          setError(el, false);
        });
      }, 350);
    });
  }

  // -----------------------------------------------------
  // Boot
  // -----------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  function start() {
    initFaq();
    initForm();
  }
})();

