/* =====================================================
   NEXORA — script.js
   Stable UI behaviors (navbar, menus, hero slider,
   product slider, reveals, and count badges).
===================================================== */

window.NEXORA = window.NEXORA || {
  state: {
    cart: [],
    wishlist: []
  }
};

/* =====================================================
   NEXORA — Unified Wishlist API
   Single source of truth used by EVERY page (index.html,
   shop.html, product pages, etc). Fixes two bugs:
   1) Wishlist items had no name/price/image because only
      a bare id was ever pushed to state — no product
      details were saved anywhere for wishlist.js to read.
   2) shop.html's heart button used its own local
      `wishlisted` object instead of this shared state, so
      it never touched localStorage/NEXORA.state at all.
===================================================== */
(function () {
  const PRODUCTS_KEY = 'nexora_wishlist_products_v1';

  const readProductMap = () => {
    try {
      const raw = window.localStorage.getItem(PRODUCTS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (_e) {
      return {};
    }
  };

  const writeProductMap = (map) => {
    try {
      window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(map));
    } catch (_e) { /* ignore (e.g. storage disabled) */ }
  };

  window.NEXORA.wishlist = {
    // Save/refresh the display details (title, price, image, etc.) for a product id.
    saveProductData(id, data) {
      if (!id || !data) return;
      const map = readProductMap();
      map[String(id)] = {
        title: data.title || 'Untitled Piece',
        category: data.category || 'NEXORA',
        price: Number.isFinite(Number(data.price)) ? Number(data.price) : 0,
        img: data.img || 'assets/img/bedroom-furniture.jpg',
        url: data.url || 'product-details.html'
      };
      writeProductMap(map);
    },

    isActive(id) {
      return window.NEXORA.state.wishlist.indexOf(String(id)) >= 0;
    },

    // Adds/removes the id from state (localStorage is auto-synced by the
    // persistence patch below) and stores its product details so the
    // wishlist page can render name/price/image correctly.
    toggle(id, data) {
      if (!id) return false;
      const strId = String(id);
      const list = window.NEXORA.state.wishlist;
      const idx = list.indexOf(strId);
      let added;

      if (idx >= 0) {
        list.splice(idx, 1);
        added = false;
      } else {
        list.push(strId);
        added = true;
        if (data) this.saveProductData(strId, data);
      }

      if (typeof window.NEXORA.updateCounts === 'function') window.NEXORA.updateCounts();
      try { window.dispatchEvent(new CustomEvent('wishlist:updated')); } catch (_e) {}

      return added;
    }
  };
})();

document.addEventListener('DOMContentLoaded', () => {

 


  /* ---------------- Atelier bar rotator ---------------- */
  (function atelierRotator(){
    const track = document.getElementById('atelierTrack');
    if(!track) return;
    const msgs = Array.from(track.querySelectorAll('.atelier-msg'));
    if(msgs.length < 2) return;

    let i = 0;
    setInterval(() => {
      msgs[i].classList.remove('is-active');
      i = (i + 1) % msgs.length;
      msgs[i].classList.add('is-active');
    }, 4200);
  })();

  /* ---------------- Navbar scroll state ---------------- */
  (function navScroll(){
    const atelierBar = document.getElementById('atelierBar');
    const navbar = document.getElementById('navbar');
    if(!navbar) return;

    const onScroll = () => {
      const y = window.scrollY;
      navbar.classList.toggle('is-scrolled', y > 40);
      if(atelierBar) atelierBar.classList.toggle('is-hidden', y > 40);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  /* ---------------- Nav link indicator ---------------- */
  (function navIndicator(){
    const nav = document.getElementById('navLinks');
    const indicator = document.getElementById('navIndicator');
    if(!nav) return;

    const desktopLinks = Array.from(nav.querySelectorAll('.nav-link'));
    const mobileLinks = Array.from(document.querySelectorAll('.mobile-menu-links a'));
    const links = [...desktopLinks, ...mobileLinks];
    if(!links.length) return;

    const place = (el) => {
      if(!indicator || !el) return;
      indicator.style.left = el.offsetLeft + 'px';
      indicator.style.width = el.offsetWidth + 'px';
    };

    const normalizePath = (p) => {
      if(!p) return '';
      try{
        return String(p).replace(/\\/g,'/').split('?')[0].split('#')[0];
      }catch(_e){
        return '';
      }
    };

    const getPageKey = (value) => {
      const path = normalizePath(value || '');
      const file = path.split('/').filter(Boolean).pop() || '';
      const clean = file.replace(/\/$/, '');

      if(!clean || clean === 'index' || clean === 'index.html') return 'home';
      if(/shop(?:\.html)?$/i.test(clean)) return 'shop';
      if(/collections(?:\.html)?$/i.test(clean)) return 'collections';
      if(/journal(?:\.html)?$/i.test(clean)) return 'journal';
      if(/about(?:\.html)?$/i.test(clean)) return 'about';
      if(/contact(?:\.html)?$/i.test(clean)) return 'contact';
      return 'home';
    };

    const currentPageKey = getPageKey(window.location.pathname || window.location.href || '');

    const applyActive = () => {
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        const isActive = getPageKey(href) === currentPageKey;
        link.classList.toggle('is-active', isActive);
      });

      const activeLink = links.find(link => link.classList.contains('is-active')) || links[0];
      if(activeLink) {
        place(activeLink);
      }
    };

    applyActive();

    window.addEventListener('resize', () => {
      const currentActive = links.find(link => link.classList.contains('is-active')) || links[0];
      place(currentActive);
    });

    links.forEach(link => {
      link.addEventListener('mouseenter', () => place(link));
      link.addEventListener('click', () => {
        links.forEach(l => l.classList.remove('is-active'));
        link.classList.add('is-active');
        place(link);
      });
    });

    nav.addEventListener('mouseleave', () => {
      const currentActive = links.find(link => link.classList.contains('is-active')) || links[0];
      place(currentActive);
    });
  })();

  /* ---------------- Search overlay (fullscreen) ---------------- */
  /* =====================================================
     Paste this script (or link it as one shared .js file)
     on every page. It's fully defensive: if #searchToggle
     or #searchOverlay is missing on a given page it just
     exits quietly instead of throwing.
  ===================================================== */
  (function () {
    'use strict';

    function initSearchOverlay() {
      const toggle  = document.getElementById('searchToggle');
      const overlay = document.getElementById('searchOverlay');
      if (!toggle || !overlay) return; // this page hasn't wired up search — see note below

      const scrim    = overlay.querySelector('[data-search-scrim]');
      const closeBtn = overlay.querySelector('[data-search-close]');
      const input    = overlay.querySelector('#searchOverlayInput');
      const form     = overlay.querySelector('#searchOverlayForm');
      const chips    = overlay.querySelectorAll('[data-search-chip]');

      let lastFocus = null;
      let isOpen = false;

      const setBodyLock = (lock) => {
        document.documentElement.style.overflow = lock ? 'hidden' : '';
        document.body.style.touchAction = lock ? 'none' : '';
      };

      const getFocusable = () => {
        const selectors = [
          'a[href]:not([tabindex="-1"])',
          'button:not([disabled]):not([tabindex="-1"])',
          'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
          '[tabindex]:not([tabindex="-1"])'
        ].join(',');
        return Array.from(overlay.querySelectorAll(selectors)).filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
      };

      const trapFocus = (e) => {
        if (!isOpen || e.key !== 'Tab') return;
        const focusables = getFocusable();
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || !overlay.contains(active)) { e.preventDefault(); last.focus(); }
        } else if (active === last) {
          e.preventDefault(); first.focus();
        }
      };

      const open = () => {
        if (isOpen) return;
        isOpen = true;
        lastFocus = document.activeElement;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
        setBodyLock(true);
        requestAnimationFrame(() => input && input.focus());
      };

      const close = () => {
        if (!isOpen) return;
        isOpen = false;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        setBodyLock(false);
        const restoreTo = (lastFocus && !overlay.contains(lastFocus)) ? lastFocus : toggle;
        if (restoreTo && typeof restoreTo.focus === 'function') restoreTo.focus();
      };

      toggle.addEventListener('click', (e) => { e.stopPropagation(); isOpen ? close() : open(); });
      closeBtn && closeBtn.addEventListener('click', (e) => { e.preventDefault(); close(); });
      scrim && scrim.addEventListener('click', (e) => { e.preventDefault(); close(); });

      document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl+K opens search from anywhere on the site
        if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          isOpen ? close() : open();
          return;
        }
        if (!isOpen) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        trapFocus(e);
      });

      overlay.addEventListener('click', (e) => {
        if (!isOpen) return;
        const panel = overlay.querySelector('.search-overlay__panel');
        if (panel && !panel.contains(e.target) && e.target !== scrim) close();
      });

      chips.forEach((chip) => {
        chip.addEventListener('click', () => {
          if (!input) return;
          input.value = chip.textContent.trim();
          input.focus();
        });
      });

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const q = input ? input.value.trim() : '';
          if (!q) { input && input.focus(); return; }

          // Root-relative target — resolves the same way no matter
          // how deep the current page is nested.
          const target = form.getAttribute('data-search-target') || '/shop.html';
          close();
          window.location.href = target + (target.includes('?') ? '&' : '?') + 'search=' + encodeURIComponent(q);
        });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSearchOverlay);
    } else {
      initSearchOverlay();
    }
  })();

  /* ---- demo-only page switcher, not part of the deliverable ---- */
  (function () {
    const navButtons = document.querySelectorAll('.site-nav__links button');
    const pages = document.querySelectorAll('.demo-page');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-page');
        navButtons.forEach((b) => b.classList.toggle('is-current', b === btn));
        pages.forEach((p) => p.classList.toggle('is-active', p.getAttribute('data-page') === target));
      });
    });
  })();


  /* ---------------- Mobile menu ---------------- */
  (function mobileMenu(){
    const burger = document.getElementById('navBurger');
    const menu = document.getElementById('mobileMenu');
    const scrim = document.getElementById('mobileScrim');
    if(!burger || !menu || !scrim) return;

    const open = () => {
      burger.classList.add('is-open');
      menu.classList.add('is-open');
      scrim.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      burger.classList.remove('is-open');
      menu.classList.remove('is-open');
      scrim.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    burger.addEventListener('click', () => {
      menu.classList.contains('is-open') ? close() : open();
    });

    scrim.addEventListener('click', close);
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu.classList.contains('is-open')) {
    close();
  }
});

    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape') close();
    });
  })();

  /* ---------------- Lux Hero ---------------- */
(function luxHero(){
  const root = document.querySelector('.lux-hero');
  if(!root) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Headline entrance: runs once, never disappears.
  const headline = root.querySelector('[data-lux-hero-headline]');
  if(headline){
    if(prefersReduced){
      root.classList.add('is-ux-ready');
      headline.dataset.uxAnimated = 'true';
    } else {
      headline.dataset.uxAnimated = 'false';
      requestAnimationFrame(() => {
        root.classList.add('is-ux-ready');
        headline.dataset.uxAnimated = 'true';
      });
    }
  }

  // Slider
  const sliderRoot = root.querySelector('#luxHeroSlider');
  const slidesWrap = root.querySelector('#luxHeroSlides');
  if(!sliderRoot || !slidesWrap) return;

  const slides = Array.from(slidesWrap.querySelectorAll('.lux-hero__slide'));
  if(!slides.length) return;

  const prevBtn = root.querySelector('#luxHeroPrev');
  const nextBtn = root.querySelector('#luxHeroNext');
  const dotsWrap = root.querySelector('#luxHeroDots');
  const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.lux-hero__dot')) : [];

  const intervalMs = 5000;
  let index = Math.max(0, slides.findIndex(s => s.classList.contains('is-active')));
  let timer = null;
  let isPaused = false;

  const setActive = (newIndex) => {
    const count = slides.length;
    index = (newIndex + count) % count;

    slides.forEach((s, i) => s.classList.toggle('is-active', i === index));

    dots.forEach((d, i) => {
      const active = i === index;
      d.classList.toggle('is-active', active);
      d.setAttribute('aria-selected', active ? 'true' : 'false');
      // Restart the progress-fill animation on the active dot.
      d.removeAttribute('data-animate');
      if(active && !prefersReduced){
        // Force reflow so the animation restarts cleanly.
        void d.offsetWidth;
        d.setAttribute('data-animate', 'true');
      }
    });
  };

  const stop = () => { if(timer){ clearInterval(timer); timer = null; } };

  const start = () => {
    if(prefersReduced || isPaused) return;
    stop();
    timer = setInterval(() => setActive(index + 1), intervalMs);
  };

  setActive(index);
  start();

  sliderRoot.addEventListener('mouseenter', () => { isPaused = true; stop(); });
  sliderRoot.addEventListener('mouseleave', () => { isPaused = false; start(); });

  prevBtn && prevBtn.addEventListener('click', () => { stop(); setActive(index - 1); start(); });
  nextBtn && nextBtn.addEventListener('click', () => { stop(); setActive(index + 1); start(); });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const target = Number(dot.getAttribute('data-dot-index'));
      if(Number.isFinite(target)){ stop(); setActive(target); start(); }
    });
  });

  sliderRoot.setAttribute('tabindex', sliderRoot.getAttribute('tabindex') || '0');
  sliderRoot.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowLeft'){ e.preventDefault(); stop(); setActive(index - 1); start(); }
    else if(e.key === 'ArrowRight'){ e.preventDefault(); stop(); setActive(index + 1); start(); }
    else if(e.key === 'Home'){ e.preventDefault(); stop(); setActive(0); start(); }
    else if(e.key === 'End'){ e.preventDefault(); stop(); setActive(slides.length - 1); start(); }
  });

  // Touch swipe
  let touchStartX = 0;
  let touchMoved = false;

  sliderRoot.addEventListener('touchstart', (e) => {
    if(!e.touches?.length) return;
    touchStartX = e.touches[0].clientX;
    touchMoved = false;
  }, { passive: true });

  sliderRoot.addEventListener('touchmove', (e) => {
    if(!e.touches?.length) return;
    if(Math.abs(e.touches[0].clientX - touchStartX) > 6) touchMoved = true;
  }, { passive: true });

  sliderRoot.addEventListener('touchend', (e) => {
    if(!touchMoved || !e.changedTouches?.length) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const threshold = 45;
    if(dx > threshold) setActive(index - 1);
    else if(dx < -threshold) setActive(index + 1);
    stop();
    start();
  }, { passive: true });
})();

  /* ---------------- Global premium reveal animations (single system) ----------------
     Single IntersectionObserver instance for the entire site. Covers every page
     (Hero, section titles, cards, images, text blocks, buttons, feature boxes,
     categories, testimonials, journal, footer columns, product/wishlist/cart cards,
     checkout sections, contact form, about sections). Animates once, then unobserves.
     window.NEXORA.reveal.observe(el) lets late-arriving elements (cart items,
     wishlist cards rendered after page load) hook into this same instance instead
     of spinning up a duplicate observer. */
  (function premiumReveal(){
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasIO = 'IntersectionObserver' in window;

    const selector = [
      '[data-reveal="fade"]',
      '[data-reveal="premium"]',
      '[data-about-reveal="fade"]',
      '.products-slider-section [data-products-reveal]'
    ].join(',');

    const applyStagger = (el) => {
      const parent = el.parentElement;
      if(parent){
        const kids = Array.from(parent.children);
        const idx = kids.indexOf(el);
        if(idx >= 0) el.style.transitionDelay = (idx * 80) + 'ms';
      }
    };

    if(reduced || !hasIO){
      const showNow = (el) => el.classList.add('reveal-in');
      Array.from(document.querySelectorAll(selector)).forEach(showNow);
      window.NEXORA = window.NEXORA || {};
      window.NEXORA.reveal = { observe: showNow };
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(!entry.isIntersecting) return;
        entry.target.classList.add('reveal-in');
        io.unobserve(entry.target); // animate only once
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

    // Stable stagger: transition-delay based on index within immediate parent.
    // Works for lists of cards without reordering DOM.
    Array.from(document.querySelectorAll(selector)).forEach((el) => {
      applyStagger(el);
      io.observe(el);
    });

    // Public hook for JS-rendered content (cart items, wishlist cards, etc.)
    window.NEXORA = window.NEXORA || {};
    window.NEXORA.reveal = {
      observe(el){
        if(!el || el.dataset.revealBound === 'true') return;
        el.dataset.revealBound = 'true';
        applyStagger(el);
        io.observe(el);
      }
    };
  })();



  /* ---------------- Featured Products Slider ---------------- */
  (function productsSlider(){
    const section = document.querySelector('.products-slider-section');
    if(!section) return;

    const viewport = section.querySelector('.products-slider-section__viewport');
    const track = section.querySelector('.products-slider-section__track');
    const prevBtn = section.querySelector('.products-slider-section__arrow--prev');
    const nextBtn = section.querySelector('.products-slider-section__arrow--next');

    if(!viewport || !track || !prevBtn || !nextBtn) return;

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const getStep = () => {
      const firstCard = track.querySelector('.products-slider-section__card');
      if(!firstCard) return 0;

      const styles = window.getComputedStyle(track);
      const gapStr = styles.columnGap || styles.gap || '18px';
      const gap = parseFloat(gapStr) || 18;

      const cardRect = firstCard.getBoundingClientRect();
      const cardWidth = cardRect.width;

      const w = window.innerWidth;
      const visible = w <= 560 ? 1 : w <= 1100 ? 2 : 4;
      return visible * cardWidth + (visible - 1) * gap;
    };

    const animateScroll = (dir) => {
      const step = getStep();
      if(!step) return;

      const amount = dir * step;
      const current = Number(track.dataset.tx || '0');
      const next = current - amount;

      const viewportRect = viewport.getBoundingClientRect();
      const minTx = Math.min(0, viewportRect.width - track.scrollWidth);
      const maxTx = 0;
      const clamped = Math.max(minTx, Math.min(maxTx, next));

      if(prefersReduced){
        track.style.transition = 'none';
        track.style.transform = `translate3d(${clamped}px,0,0)`;
        track.dataset.tx = String(clamped);
        return;
      }

      track.style.transition = 'transform 0.45s var(--ease)';
      track.style.transform = `translate3d(${clamped}px,0,0)`;
      track.dataset.tx = String(clamped);

      window.clearTimeout(track._txTimer);
      track._txTimer = window.setTimeout(()=>{
        track.style.transition = '';
      }, 520);
    };

   if(!track.dataset.tx) track.dataset.tx = '0';
    track.style.transform = 'translate3d(0px,0,0)';

    prevBtn.addEventListener('click', () => animateScroll(-1));
    nextBtn.addEventListener('click', () => animateScroll(1));

    // Pointer drag
    let startX = 0;
    let isDragging = false;
    let moved = false;
    let lastTx = 0;

    const onPointerDown = (e) => {
      if(e.pointerType === 'mouse' && e.button !== 0) return;
      // Don't hijack pointer capture when the press starts on an interactive
      // control (Add to Cart, View Details, Wishlist). Capturing the pointer
      // here redirects the resulting click event's target to `track` instead
      // of the button/link, so the click never reaches its handler.
      if(e.target.closest('a, button, [data-cart], [data-wishlist], [data-details-link]')) return;
      isDragging = true;
      moved = false;
      startX = e.clientX;
      lastTx = Number(track.dataset.tx || '0');

      track.setPointerCapture && track.setPointerCapture(e.pointerId);
      track.style.transition = 'none';
    };


    const onPointerMove = (e) => {
      if(!isDragging) return;
      const dx = e.clientX - startX;
      if(Math.abs(dx) > 8) moved = true;

      const viewportRect = viewport.getBoundingClientRect();
      const minTx = Math.min(0, viewportRect.width - track.scrollWidth);
      const maxTx = 0;

      const next = Math.max(minTx, Math.min(maxTx, lastTx + dx));
      track.style.transform = `translate3d(${next}px,0,0)`;
      track.dataset.tx = String(next);
    };

    const onPointerUp = (e) => {
      if(!isDragging) return;
      isDragging = false;

      if(!moved) return; // tap

      const dx = e.clientX - startX;
      const threshold = 40;

      if(dx < -threshold) animateScroll(1);
      else if(dx > threshold) animateScroll(-1);
      else {
        const step = getStep();
        const current = Number(track.dataset.tx || '0');
        if(step){
          const target = Math.round(current / -step) * -step;
          const viewportRect = viewport.getBoundingClientRect();
          const minTx = Math.min(0, viewportRect.width - track.scrollWidth);
          const maxTx = 0;
          const clamped = Math.max(minTx, Math.min(maxTx, target));

          track.style.transition = prefersReduced ? 'none' : 'transform 0.45s var(--ease)';
          track.style.transform = `translate3d(${clamped}px,0,0)`;
          track.dataset.tx = String(clamped);
        }
      }
    };

    viewport.addEventListener('pointerdown', onPointerDown, { passive: true });
    viewport.addEventListener('pointermove', onPointerMove, { passive: true });
    viewport.addEventListener('pointerup', onPointerUp, { passive: true });
    viewport.addEventListener('pointercancel', onPointerUp, { passive: true });

    window.addEventListener('resize', () => {
      const viewportRect = viewport.getBoundingClientRect();
      const minTx = Math.min(0, viewportRect.width - track.scrollWidth);
      const maxTx = 0;
      const current = Number(track.dataset.tx || '0');
      const clamped = Math.max(minTx, Math.min(maxTx, current));
      track.style.transition = 'none';
      track.style.transform = `translate3d(${clamped}px,0,0)`;
      track.dataset.tx = String(clamped);
    });
  })();

  /* ---------------- NEXORA About Section: Reveal + Counter ---------------- */
  (function aboutSectionUx(){
    const about = document.querySelector('.about-section');
    if(!about) return;

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scroll reveal for this section's [data-about-reveal="fade"] elements is
    // handled by the single global premiumReveal observer (script.js, above).

    // Counter animation
    const counterEls = Array.from(about.querySelectorAll('[data-counter][data-target]'));
    if(!counterEls.length) return;

    const animateCounter = (el) => {
      const target = Number(el.getAttribute('data-target'));
      if(!Number.isFinite(target)) return;

      if(reduced){
        el.textContent = String(target);
        return;
      }

      const duration = 1200;
      const start = performance.now();
      const from = 0;

      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const value = Math.round(from + (target - from) * eased);
        el.textContent = String(value);
        if(t < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const startCounters = () => {
      counterEls.forEach(el => {
        if(el.dataset.counted === 'true') return;
        el.dataset.counted = 'true';
        animateCounter(el);
      });
    };

    const trigger = about.querySelector('.about-section__statsInner') || about;

    if(reduced || !('IntersectionObserver' in window)){
      startCounters();
    } else {
      const ioCount = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            startCounters();
            ioCount.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });

      ioCount.observe(trigger);
    }
  })();

  /* ---------------- Count badges (cart / wishlist) ---------------- */
  (function countBadges(){


    // If a shop-only module exists, load it (without affecting non-shop pages)
    try{
      if(window.NEXORA && window.NEXORA._shopUXLoaded){}else{
        window.NEXORA._shopUXLoaded = true;
        const s = document.createElement('script');
        s.src = 'append-shop-ux.js';
        s.defer = true;
        document.head.appendChild(s);
      }
    }catch(err){ /* ignore */ }

    window.NEXORA.updateCounts = function(){
      const cartCount = document.getElementById('cartCount');
      const wishlistCount = document.getElementById('wishlistCount');

      const cart = window.NEXORA.state.cart;
      const cartQty = window.NEXORA.state.cartQty && typeof window.NEXORA.state.cartQty === 'object' ? window.NEXORA.state.cartQty : {};
      const w = window.NEXORA.state.wishlist.length;

      const c = Array.isArray(cart)
        ? cart.reduce((acc, id) => {
            const q = cartQty && Object.prototype.hasOwnProperty.call(cartQty, id) ? cartQty[id] : 1;
            const n = Math.floor(Number(q));
            return acc + (Number.isFinite(n) && n > 0 ? n : 1);
          }, 0)
        : 0;

      if(cartCount){
        cartCount.textContent = String(c);
        cartCount.classList.toggle('is-visible', c > 0);
      }

      if(wishlistCount){
        wishlistCount.textContent = String(w);
        wishlistCount.classList.toggle('is-visible', w > 0);
      }
    };

// Unified cart API will define updateCounts usage; keep badge rendering compatible.
window.NEXORA.updateCounts();
  })();

  /* ---------------- Newsletter subscribe forms ---------------- */
  (function newsletterForms(){
    const forms = Array.from(document.querySelectorAll('.newsletter-section__form'));
    if(!forms.length) return;

    forms.forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const input = form.querySelector('input[type="email"]');
        const btn = form.querySelector('.newsletter-section__btn');
        if(input && !input.value.trim()) return;

        if(btn){
          const span = btn.querySelector('span');
          const originalText = span ? span.textContent : null;
          if(span) span.textContent = 'Subscribed ✓';
          btn.disabled = true;

          setTimeout(() => {
            if(span && originalText) span.textContent = originalText;
            btn.disabled = false;
            if(input) input.value = '';
          }, 2200);
        }
      });
    });
  })();

  /* ---------------- Homepage Featured Products — Add to Cart / Wishlist ---------------- */
  (function featuredProductsActions(){
    const track = document.querySelector('.products-slider-section__track');
    if(!track) return;

    const getCardId = (card) => {
      // Featured Products must use a real product identifier.
      // Added as: data-product-id="..." on each featured card.
      return (card && card.getAttribute('data-product-id')) ? String(card.getAttribute('data-product-id')).trim() : ''};

    // Pull the real title/price/image/category straight out of the card's
    // own markup so every product gets its correct wishlist details
    // (this is what was missing before — only the id was ever captured).
    const getCardData = (card) => {
      if(!card) return null;
      const titleEl = card.querySelector('.product-card__title');
      const priceEl = card.querySelector('.product-card__price--now');
      const imgEl = card.querySelector('.product-card__img');
      const detailsLink = card.querySelector('[data-details-link]');
      const categoryAttr = card.getAttribute('data-category');
      const pillEl = card.querySelector('.product-pill');

      const priceText = priceEl ? priceEl.textContent : '';
      const priceNum = Number.parseFloat(String(priceText).replace(/[^0-9.]/g, ''));

      return {
        title: titleEl ? titleEl.textContent.trim() : 'Untitled Piece',
        category: (categoryAttr || (pillEl ? pillEl.textContent.trim() : '') || 'NEXORA'),
        price: Number.isFinite(priceNum) ? priceNum : 0,
        img: imgEl ? imgEl.getAttribute('src') : 'assets/img/bedroom-furniture.jpg',
        url: detailsLink ? (detailsLink.getAttribute('href') || 'product-details.html') : 'product-details.html'
      };
    };

    // Sync heart icons to reflect any previously saved wishlist state
    // (e.g. items added on shop.html) as soon as the page loads.
    const syncWishlistButtons = () => {
      track.querySelectorAll('.product-card').forEach((card) => {
        const id = getCardId(card);
        const btn = card.querySelector('[data-wishlist]');
        if(id && btn) btn.classList.toggle('is-active', window.NEXORA.wishlist.isActive(id));
      });
    };
    syncWishlistButtons();
    window.addEventListener('wishlist:updated', syncWishlistButtons);

    track.addEventListener('click', (e) => {
      const wishBtn = e.target.closest('[data-wishlist]');
      const cartBtn = e.target.closest('[data-cart]');
      if(!wishBtn && !cartBtn) return;

      const card = (wishBtn || cartBtn).closest('.product-card');
      if(!card) return;

      // Prefer the button's explicit product id (more reliable on dynamic cards)
      const id = (cartBtn && cartBtn.getAttribute('data-cart-product-id'))
        ? String(cartBtn.getAttribute('data-cart-product-id')).trim()
        : (wishBtn && wishBtn.closest('.product-card') && wishBtn.closest('.product-card').getAttribute('data-product-id'))
          ? String(wishBtn.closest('.product-card').getAttribute('data-product-id')).trim()
          : getCardId(card);

      if(wishBtn){
        if(!id) return;
        const data = getCardData(card);
        const nowActive = window.NEXORA.wishlist.toggle(id, data);
        wishBtn.classList.toggle('is-active', nowActive);
      }

      if(cartBtn){
        if(!id) return;
        if(window.NEXORA.cart && typeof window.NEXORA.cart.add === 'function'){
          window.NEXORA.cart.add(id, 1, getCardData(card));
        }
      }
    });
  })();


  });

  /* ---------------- Scroll-to-Top (premium) ---------------- */
  (function scrollToTopPremium(){
    const btn = document.getElementById('scrollToTopBtn');
    if(!btn) return;

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const THRESHOLD_PX = 300;

    // Ensure baseline accessibility behavior (no duplicate listeners/IDs)
    btn.setAttribute('type', btn.getAttribute('type') || 'button');

    const setVisible = (visible) => {
      btn.classList.toggle('is-visible', !!visible);
    };

    let rafId = null;
    let lastY = -1;

    const getScrollY = () => window.scrollY || document.documentElement.scrollTop || 0;

    const update = () => {
      rafId = null;
      const y = getScrollY();
      if(y === lastY) return;
      lastY = y;
      setVisible(y > THRESHOLD_PX);
    };

    const onScroll = () => {
      if(rafId) return;
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });

    if(prefersReduced){
      // Keep state correct but avoid extra scroll work.
      window.removeEventListener('scroll', onScroll);
    }

    // rAF-friendly smooth scroll-to-top
    const scrollToTop = () => {
      if(prefersReduced){
        window.scrollTo(0, 0);
        return;
      }

      // Use native smooth scrolling for best performance + browser optimizations.
      // (Also aligns with the project’s global smooth scroll behavior.)
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Fallback: if smooth scrolling is unsupported, ensure end state via rAF.
      if(!('scrollBehavior' in document.documentElement.style)){
        const start = getScrollY();
        const startT = performance.now();
        const DURATION = 450;
        const step = (now) => {
          const t = Math.min(1, (now - startT) / DURATION);
          const eased = 1 - Math.pow(1 - t, 3);
          const nextY = Math.round(start + (0 - start) * eased);
          window.scrollTo(0, nextY);
          if(t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    };

    btn.addEventListener('click', scrollToTop);

    // Keyboard users: Enter/Space already activate <button>, but keep explicit for safety
    btn.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        scrollToTop();
      }
    });

  })();





/* =====================================================
   NEXORA — Cart/Wishlist persistence (localStorage)
   append-only; defensive; backward compatible
===================================================== */


(function nexoraCartWishlistPersistence(){
  if(!window.NEXORA) window.NEXORA = { state: { cart: [], wishlist: [] } };
  if(!window.NEXORA.state) window.NEXORA.state = { cart: [], wishlist: [] };
  if(!Array.isArray(window.NEXORA.state.cart)) window.NEXORA.state.cart = [];
  if(!Array.isArray(window.NEXORA.state.wishlist)) window.NEXORA.state.wishlist = [];

  // Prevent duplicate initialization
  if(window.NEXORA._storagePersistenceInitialized) return;
  window.NEXORA._storagePersistenceInitialized = true;

  const CART_KEY = 'nexora_cart';
  const WISHLIST_KEY = 'nexora_wishlist';
  const CART_QTY_KEY = 'nexora_cart_qty_v1';

  const safeParseArray = (raw) => {
    if(!raw || typeof raw !== 'string') return [];
    try{
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }catch(_e){
      return [];
    }
  };

  const safeWrite = (key, arr) => {
    try{
      if(!window.localStorage) return false;
      window.localStorage.setItem(key, JSON.stringify(arr));
      return true;
    }catch(_e){
      return false;
    }
  };

  const isStorageUsable = () => {
    try{
      if(!window.localStorage) return false;
      const testKey = '__nexora_ls_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    }catch(_e){
      return false;
    }
  };

  const storageAvailable = isStorageUsable();

  window.NEXORA.storage = window.NEXORA.storage || {
    loadCart: function(){
      if(!storageAvailable) return [];
      return safeParseArray(window.localStorage.getItem(CART_KEY));
    },
    saveCart: function(){
      if(!storageAvailable) return false;
      return safeWrite(CART_KEY, window.NEXORA.state.cart);
    },
    loadWishlist: function(){
      if(!storageAvailable) return [];
      return safeParseArray(window.localStorage.getItem(WISHLIST_KEY));
    },
    saveWishlist: function(){
      if(!storageAvailable) return false;
      return safeWrite(WISHLIST_KEY, window.NEXORA.state.wishlist);
    },
    loadCartQty: function(){
      if(!storageAvailable) return {};
      const raw = window.localStorage.getItem(CART_QTY_KEY);
      if(!raw || typeof raw !== 'string') return {};
      try{
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      }catch(_e){
        return {};
      }
    },
    saveCartQty: function(map){
      if(!storageAvailable) return false;
      const safe = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
      return safeWrite(CART_QTY_KEY, safe);
    }
  };

  const dispatchUpdated = (name) => {
    try{
      window.dispatchEvent(new CustomEvent(name));
    }catch(_e){
      // ignore
    }
  };

  // Hydrate from localStorage on DOMContentLoaded (required)
  const hydrate = () => {
    try{
      const loadedCart = window.NEXORA.storage.loadCart();
      const loadedWishlist = window.NEXORA.storage.loadWishlist();
      const loadedCartQty = window.NEXORA.storage.loadCartQty ? window.NEXORA.storage.loadCartQty() : {};

      // Replace contents while keeping same array references
      window.NEXORA.state.cart.splice(0, window.NEXORA.state.cart.length, ...loadedCart);
      window.NEXORA.state.wishlist.splice(0, window.NEXORA.state.wishlist.length, ...loadedWishlist);

      // Store qty map on state for quick access (cart page will use it)
      if(!window.NEXORA.state.cartQty || typeof window.NEXORA.state.cartQty !== 'object'){
        window.NEXORA.state.cartQty = {};
      }
      window.NEXORA.state.cartQty = (loadedCartQty && typeof loadedCartQty === 'object' && !Array.isArray(loadedCartQty)) ? loadedCartQty : {};
    }catch(_e){
      // Defensive fallback: ensure arrays
      if(!Array.isArray(window.NEXORA.state.cart)) window.NEXORA.state.cart = [];
      if(!Array.isArray(window.NEXORA.state.wishlist)) window.NEXORA.state.wishlist = [];
      if(!window.NEXORA.state.cartQty || typeof window.NEXORA.state.cartQty !== 'object') window.NEXORA.state.cartQty = {};
    }

    // Ensure counters reflect hydrated state
    if(typeof window.NEXORA.updateCounts === 'function'){
      try{ window.NEXORA.updateCounts(); }catch(_e){}
    }

    // Persist immediately after hydration so corrupted-but-valid arrays get normalized.
    try{
      window.NEXORA.storage.saveCart && window.NEXORA.storage.saveCart();
      window.NEXORA.storage.saveWishlist && window.NEXORA.storage.saveWishlist();
      window.NEXORA.storage.saveCartQty && window.NEXORA.storage.saveCartQty(window.NEXORA.state.cartQty);
    }catch(_e){}
  };

  const onReady = () => {
    // Avoid double hydrate
    if(window.NEXORA._storagePersistenceHydrated) return;
    window.NEXORA._storagePersistenceHydrated = true;
    hydrate();

    // --- Mutation persistence ---
    // We patch common array mutators so existing code that uses push/splice/etc auto-saves.
    const patchArray = (arr, saveFn, eventName) => {
      if(!arr || !Array.isArray(arr) || arr._nexoraPatchedForStorage) return;
      arr._nexoraPatchedForStorage = true;

      const mutationMethods = [
        'push','pop','shift','unshift','splice','sort','reverse'
      ];

      mutationMethods.forEach((method) => {
        if(typeof arr[method] !== 'function') return;
        const original = arr[method];
        arr[method] = function(){
          const result = original.apply(this, arguments);
          try{
            const ok = saveFn && saveFn();
            if(ok) dispatchUpdated(eventName);
          }catch(_e){}
          return result;
        };
      });

      // Also persist on direct index/length writes (best-effort). This uses a non-standard
      // approach: property setter patching for length is unreliable, so we rely on method patching.
      // Existing code uses push/splice primarily, so this should cover real behavior.
    };

    patchArray(window.NEXORA.state.cart, () => window.NEXORA.storage.saveCart(), 'cart:updated');
    patchArray(window.NEXORA.state.wishlist, () => window.NEXORA.storage.saveWishlist(), 'wishlist:updated');

    // Persist qty map on state changes triggered by cart page
    // (We do not patch object mutations deeply; cart page will explicitly call saveCartQty.)
  if(!window.NEXORA.state.cartQty) window.NEXORA.state.cartQty = window.NEXORA.storage.loadCartQty ? window.NEXORA.storage.loadCartQty() : {};
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    // Script already ran after DOM ready
    onReady();
  }
})();

/* =====================================================
   ABOUT PAGE — NEXORA (append-only, scoped)
   Reveal animations + animated counters
===================================================== */

(function nexoraAboutEnhancements(){

  // Prevent duplicate init across SPA-like reloads / accidental multiple script loads
  if(window.NEXORA && window.NEXORA._aboutUXInitialized) return;
  if(window.NEXORA) window.NEXORA._aboutUXInitialized = true;

  // Detect About page safely
  const hero = document.querySelector('.about-hero') || document.getElementById('aboutHero');
  if(!hero) return;

  const root = hero.closest('main') || hero.parentElement || document.body;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  // Scroll reveals for [data-about-reveal="fade"] are handled by the single
  // global premiumReveal observer (script.js, above) — includes 80ms stagger.

  // ---- Animated counters ----
  const counterEls = Array.from(root.querySelectorAll('.about-stats [data-counter][data-target]'));
  const startCounters = () => {
    counterEls.forEach(el => {
      if(el.dataset.counted === 'true') return;
      el.dataset.counted = 'true';

      const target = Number(el.getAttribute('data-target'));
      if(!Number.isFinite(target)) return;

      if(prefersReduced){
        el.textContent = String(target);
        return;
      }

      const duration = 1100;
      const start = performance.now();
      const from = 0;

      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const value = Math.round(from + (target - from) * eased);
        el.textContent = String(value);
        if(t < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  };

  if(!counterEls.length) return;

  if(prefersReduced || !hasIO){
    startCounters();
  } else {
    const statsSection = root.querySelector('.about-stats') || hero;
    const trigger = statsSection;
    const ioCount = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          startCounters();
          ioCount.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });

    ioCount.observe(trigger);
  }
})();

/*=====================================
    PREMIUM BACK TO TOP
=====================================*/

document.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("scrollToTopBtn");

    if (!btn) return;

    let ticking = false;

    function updateButton() {

        if (window.scrollY > 300) {

            btn.classList.add("show");

        } else {

            btn.classList.remove("show");

        }

        ticking = false;
    }

    window.addEventListener("scroll", () => {

        if (!ticking) {

            requestAnimationFrame(updateButton);

            ticking = true;
        }

    }, { passive: true });

    btn.addEventListener("click", () => {

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    });

});