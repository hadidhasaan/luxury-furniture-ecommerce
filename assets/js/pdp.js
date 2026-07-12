(function(){
  const root = document.querySelector('.pdp-root');
  if(!root) return;

  const pdp = {
    state: {
      // Hydrated from localStorage by initProductHydration() below.
      productId: 'pdp-sable-platform-bed',
      qty: 1,
      activeImageIndex: 0,
      reviewFilter: 'all'
    },
    els: {}
  };

  // ---------- Helpers ----------
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const money = (s) => (s && String(s).trim() ? String(s).trim() : '');

  const ensureProductIdInStorage = () => {
    // Backward compatible: if user lands here without selection, keep the current default.
    try{
      const key = 'nexora_selected_product_id';
      const current = String(pdp.state.productId || '').trim();
      if(current) localStorage.setItem(key, current);
    }catch(_e){ /* ignore */ }
  };

  const ensureNexora = () => {
    window.NEXORA = window.NEXORA || { state: { cart: [], wishlist: [] } };
    if(!window.NEXORA.state) window.NEXORA.state = { cart: [], wishlist: [] };
    if(typeof window.NEXORA.updateCounts !== 'function'){
      window.NEXORA.updateCounts = function(){};
    }
  };

  const productKey = (id) => String(id);

  const getQtyInput = () => root.querySelector('[data-qty-input]');
  const setQty = (n) => {
    const v = clamp(Number(n) || 1, 1, 99);
    pdp.state.qty = v;
    const input = getQtyInput();
    if(input) input.value = String(v);
  };

  const addToCart = (opts) => {
    ensureNexora();
    const { id, qty } = opts || {};
    const q = clamp(Number(qty) || 1, 1, 99);
    const key = productKey(id || pdp.state.productId);

    if(window.NEXORA.cart && typeof window.NEXORA.cart.add === 'function'){
      // Unified cart API: tracks quantity + persists to localStorage + shows toast.
      window.NEXORA.cart.add(key, q);
    } else {
      // Fallback: cart stores unique items (toggle-like behavior already used in shop modal).
      const cart = window.NEXORA.state.cart;
      if(!cart.includes(key)) cart.push(key);
      window.NEXORA.updateCounts && window.NEXORA.updateCounts();
    }

    const live = root.querySelector('[data-live-region]') || document.createElement('div');
    if(!live.parentElement) {
      live.setAttribute('data-live-region', '');
      live.className = 'pdp-srOnly';
      root.appendChild(live);
    }
    live.textContent = `Added ${q} item${q === 1 ? '' : 's'} to cart.`;
  };

  const toggleWishlist = (id) => {
    ensureNexora();
    const key = productKey(id || pdp.state.productId);
    const list = window.NEXORA.state.wishlist;
    const idx = list.indexOf(key);
    if(idx >= 0) list.splice(idx, 1);
    else list.push(key);
    window.NEXORA.updateCounts && window.NEXORA.updateCounts();

    return list.includes(key);
  };

  // ---------- Gallery switching + zoom ----------
  const initGallery = () => {
    const frame = root.querySelector('[data-zoom-area]');
    const zoomHint = root.querySelector('.pdp-gallery__zoomHint');
    const mainImg = root.querySelector('[data-main-img]') || root.querySelector('.pdp-gallery__img');
    const skeleton = root.querySelector('[data-skeleton-main]');

    const thumbs = Array.from(root.querySelectorAll('[data-thumb-index]'));
    const images = thumbs.map((t) => {
      const img = t.querySelector('img');
      return img ? img.getAttribute('src') : '';
    });

    const setActive = (idx, opts = { announce: false }) => {
      const next = clamp(idx, 0, thumbs.length - 1);
      pdp.state.activeImageIndex = next;

      thumbs.forEach((t, i) => t.classList.toggle('is-active', i === next));

      const nextSrc = images[next] || mainImg?.getAttribute('src');
      if(mainImg && nextSrc){
        // Smooth switching: fade via opacity toggle
        mainImg.style.opacity = '0';
        requestAnimationFrame(() => {
          mainImg.setAttribute('src', nextSrc);
          mainImg.style.opacity = '1';
        });
      }

      if(zoomHint && mainImg && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        // keep hint visible only on hover/zoom area
      }

      if(skeleton){
        skeleton.style.display = 'block';
        setTimeout(() => { skeleton.style.display = 'none'; }, 220);
      }

      if(opts.announce){
        const live = root.querySelector('[data-live-region]');
        if(live) live.textContent = `Showing image ${next + 1} of ${thumbs.length}.`;
      }
    };

    if(!thumbs.length || !mainImg) return;

    thumbs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-thumb-index') || '0');
        setActive(idx);
      });

      btn.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          const idx = Number(btn.getAttribute('data-thumb-index') || '0');
          setActive(idx);
        }
      });
    });

    if(frame){
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      if(zoomHint && isCoarsePointer) zoomHint.textContent = 'Tap to zoom';

      let raf = null;
      const move = (clientX, clientY) => {
        if(prefersReduced) return;
        const r = frame.getBoundingClientRect();
        const x = clamp(clientX - r.left, 0, r.width);
        const y = clamp(clientY - r.top, 0, r.height);
        frame.style.setProperty('--mx', `${(x / r.width) * 100}%`);
        frame.style.setProperty('--my', `${(y / r.height) * 100}%`);
      };

      const openZoom = () => {
        root.classList.add('pdp-zooming');
        if(zoomHint) zoomHint.disabled = false;
      };
      const closeZoom = () => {
        root.classList.remove('pdp-zooming');
        if(zoomHint) zoomHint.disabled = true;
        frame.style.removeProperty('--mx');
        frame.style.removeProperty('--my');
      };

      // ---- Mouse / trackpad: hover-and-drag magnify (unchanged) ----
      frame.addEventListener('pointerenter', (e) => {
        if(e.pointerType === 'mouse') openZoom();
      });

      frame.addEventListener('pointerleave', (e) => {
        if(e.pointerType === 'mouse') closeZoom();
      });

      frame.addEventListener('pointermove', (e) => {
        if(e.pointerType !== 'mouse' || prefersReduced) return;
        if(raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => move(e.clientX, e.clientY));
      }, { passive: true });

      // ---- Touch / pen: no hover exists, so a hover-drag gesture would
      // just fight the page's own scrolling. Instead, a single tap toggles
      // a centered zoom; tapping again (or tapping outside) closes it. ----
      frame.addEventListener('pointerup', (e) => {
        if(e.pointerType === 'mouse') return;
        e.preventDefault();
        if(root.classList.contains('pdp-zooming')){
          closeZoom();
        } else {
          frame.style.setProperty('--mx', '50%');
          frame.style.setProperty('--my', '50%');
          openZoom();
        }
      });

      document.addEventListener('pointerdown', (e) => {
        if(root.classList.contains('pdp-zooming') && !frame.contains(e.target)){
          closeZoom();
        }
      });

      // Keyboard: focus zoom area triggers zoom styling
      frame.setAttribute('tabindex', '0');
      frame.addEventListener('focus', openZoom);
      frame.addEventListener('blur', closeZoom);
      frame.addEventListener('keydown', (e) => {
        if(e.key === 'Escape') closeZoom();
      });
    }

    // Default active thumb
    const activeThumb = thumbs.findIndex((t) => t.classList.contains('is-active'));
    setActive(activeThumb >= 0 ? activeThumb : 0);
  };

  // ---------- Quantity + cart/wishlist ----------
  const initPurchase = () => {
    const qtyInput = getQtyInput();
    const decBtn = root.querySelector('[data-qty-decrease]');
    const incBtn = root.querySelector('[data-qty-increase]');

    const normalizeQtyFromInput = () => {
      if(!qtyInput) return;
      const v = clamp(Number(qtyInput.value || '1'), 1, 99);
      if(String(v) !== String(qtyInput.value)) qtyInput.value = String(v);
      pdp.state.qty = v;
    };

    if(qtyInput){
  setQty(1);

  qtyInput.addEventListener('input', normalizeQtyFromInput);
  qtyInput.addEventListener('change', normalizeQtyFromInput);
  qtyInput.addEventListener('blur', normalizeQtyFromInput);
}

    decBtn && decBtn.addEventListener('click', () => setQty(pdp.state.qty - 1));
    incBtn && incBtn.addEventListener('click', () => setQty(pdp.state.qty + 1));

    root.querySelector('[data-add-to-cart]')?.addEventListener('click', () => {
      addToCart({ id: pdp.state.productId, qty: pdp.state.qty });
    });

    root.querySelector('[data-add-to-wishlist]')?.addEventListener('click', () => {
      const isNow = toggleWishlist(pdp.state.productId);
      const btn = root.querySelector('[data-add-to-wishlist]');
      if(btn) btn.classList.toggle('is-active', isNow);
    });

    // Sticky bar
    root.querySelector('[data-sticky-add]')?.addEventListener('click', () => {
      addToCart({ id: pdp.state.productId, qty: pdp.state.qty });
    });
  };

  // ---------- Tabs ----------
  const initTabs = () => {
    const tabs = Array.from(root.querySelectorAll('[role="tab"][data-tab]'));
    const panels = Array.from(root.querySelectorAll('[role="tabpanel"][data-tab-panel]'));
    if(!tabs.length || !panels.length) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const showPanel = (tabKey, focusTab = true) => {
      const activeTab = tabs.find(t => t.getAttribute('data-tab') === tabKey);
      if(!activeTab) return;

      tabs.forEach(t => {
        const active = t === activeTab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
        t.tabIndex = active ? 0 : -1;
      });

      panels.forEach(p => {
        const active = p.getAttribute('data-tab-panel') === tabKey;
        p.classList.toggle('is-active', active);
      });

      if(focusTab) activeTab.focus({ preventScroll: true });

      if(prefersReduced){
        // no-op
      }
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => showPanel(tab.getAttribute('data-tab')));
      tab.addEventListener('keydown', (e) => {
        if(e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
          e.preventDefault();
          const idx = tabs.indexOf(tab);
          const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
          const wrapped = (next + tabs.length) % tabs.length;
          showPanel(tabs[wrapped].getAttribute('data-tab'), true);
        }
        if(e.key === 'Home'){
          e.preventDefault();
          showPanel(tabs[0].getAttribute('data-tab'), true);
        }
        if(e.key === 'End'){
          e.preventDefault();
          showPanel(tabs[tabs.length - 1].getAttribute('data-tab'), true);
        }
      });
    });
  };

  // ---------- Specs table row interaction ----------
  const initSpecsTable = () => {
    const rows = Array.from(root.querySelectorAll('[data-spec-row]'));
    if(!rows.length) return;

    const clear = () => rows.forEach(r => r.classList.remove('is-active'));

    rows.forEach((r) => {
      r.addEventListener('mouseenter', () => {
        clear();
        r.classList.add('is-active');
      });
      r.addEventListener('focus', () => {
        clear();
        r.classList.add('is-active');
      });
      r.addEventListener('blur', () => r.classList.remove('is-active'));
      r.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          clear();
          r.classList.add('is-active');
        }
      });
    });
  };

  // ---------- Reviews filtering ----------
  const initReviews = () => {
    const filters = Array.from(root.querySelectorAll('[data-rating-filter]'));
    const reviews = Array.from(root.querySelectorAll('[data-review]'));
    if(!filters.length || !reviews.length) return;

    const setFilter = (value) => {
      pdp.state.reviewFilter = value;
      filters.forEach(b => {
        const active = b.getAttribute('data-rating-filter') === value;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      reviews.forEach(card => {
        const rating = Number(card.getAttribute('data-rating') || '0');
        const show = value === 'all' ? true : rating >= Number(value);
        card.style.display = show ? '' : 'none';
      });
    };

    filters.forEach((b) => {
      b.addEventListener('click', () => setFilter(b.getAttribute('data-rating-filter')));
      b.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          setFilter(b.getAttribute('data-rating-filter'));
        }
      });
    });

    setFilter('all');
  };

  // ---------- Related products slider ----------
  const initRelated = () => {
    const wrap = root.querySelector('[data-related-slider]');
    if(!wrap) return;

    const viewport = wrap.querySelector('.pdp-related__viewport');
    const track = wrap.querySelector('.pdp-related__track');
    const prevBtn = wrap.querySelector('.pdp-related__arrow--prev');
    const nextBtn = wrap.querySelector('.pdp-related__arrow--next');

    if(!viewport || !track || !prevBtn || !nextBtn) return;

    const getStep = () => {
      const first = track.querySelector('.pdp-relatedCard');
      if(!first) return 0;
      const styles = window.getComputedStyle(track);
      const gapStr = styles.gap || '18px';
      const gap = parseFloat(gapStr) || 18;
      const cardWidth = first.getBoundingClientRect().width;
      const w = window.innerWidth;
      const visible = w <= 640 ? 1 : w <= 1080 ? 2 : 4;
      return visible * cardWidth + (visible - 1) * gap;
    };

    const animateScroll = (dir) => {
      const step = getStep();
      if(!step) return;
      const current = Number(track.dataset.tx || '0');
      const target = current - dir * step;

      const viewportRect = viewport.getBoundingClientRect();
      const minTx = Math.min(0, viewportRect.width - track.scrollWidth);
      const clamped = Math.max(minTx, Math.min(0, target));

      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(prefersReduced){
        track.style.transition = 'none';
        track.style.transform = `translate3d(${clamped}px,0,0)`;
        track.dataset.tx = String(clamped);
        return;
      }

      track.style.transition = 'transform 0.45s var(--ease)';
      track.style.transform = `translate3d(${clamped}px,0,0)`;
      track.dataset.tx = String(clamped);

      clearTimeout(track._txTimer);
      track._txTimer = setTimeout(() => { track.style.transition = ''; }, 520);
    };

    if(!track.dataset.tx) track.dataset.tx = '0';
    track.style.transform = `translate3d(${track.dataset.tx}px,0,0)`;

   prevBtn.addEventListener('click', () => animateScroll(-1));
nextBtn.addEventListener('click', () => animateScroll(1));

wrap.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    animateScroll(-1);
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    animateScroll(1);
  }
});

    // pointer drag
    let startX = 0;
    let isDragging = false;
    let moved = false;
    let lastTx = 0;

    const onPointerDown = (e) => {
      if(e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging = true;
      moved = false;
      startX = e.clientX;
      lastTx = Number(track.dataset.tx || '0');
      track.style.transition = 'none';
      track.setPointerCapture && track.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if(!isDragging) return;
      const dx = e.clientX - startX;
      if(Math.abs(dx) > 8) moved = true;

      const viewportRect = viewport.getBoundingClientRect();
      const minTx = Math.min(0, viewportRect.width - track.scrollWidth);
      const next = Math.max(minTx, Math.min(0, lastTx + dx));
      track.style.transform = `translate3d(${next}px,0,0)`;
      track.dataset.tx = String(next);
    };

    const onPointerUp = (e) => {
      if(!isDragging) return;
      isDragging = false;
      if(!moved) return;

      const dx = e.clientX - startX;
      const threshold = 40;
      if(dx < -threshold) animateScroll(1);
      else if(dx > threshold) animateScroll(-1);
      else {
        animateScroll(0);
      }
    };

    viewport.addEventListener('pointerdown', onPointerDown, { passive: true });
    viewport.addEventListener('pointermove', onPointerMove, { passive: true });
    viewport.addEventListener('pointerup', onPointerUp, { passive: true });
    viewport.addEventListener('pointercancel', onPointerUp, { passive: true });

    window.addEventListener('resize', () => {
      const viewportRect = viewport.getBoundingClientRect();
      const minTx = Math.min(0, viewportRect.width - track.scrollWidth);
      const current = Number(track.dataset.tx || '0');
      const clamped = Math.max(minTx, Math.min(0, current));
      track.style.transition = 'none';
      track.style.transform = `translate3d(${clamped}px,0,0)`;
      track.dataset.tx = String(clamped);
    });

    // Related add-to-cart / wishlist (hook into global state)
    wrap.querySelectorAll('[data-related-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        // Use closest card title as id; premium demo.
        const card = btn.closest('[data-related-item]');
        const title = card?.querySelector('.pdp-relatedCard__title')?.textContent?.trim();
        addToCart({ id: title || 'related-product', qty: 1 });
      });
    });

    wrap.querySelectorAll('[data-wishlist-related]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('[data-related-item]');
        const title = card?.querySelector('.pdp-relatedCard__title')?.textContent?.trim();
        const isNow = toggleWishlist(title || 'related-product');
        btn.classList.toggle('is-active', isNow);
      });
    });
  };

  // ---------- Recently viewed (LocalStorage) ----------
  const initRecentlyViewed = () => {
    const grid = root.querySelector('[data-recent-grid]');
    if(!grid) return;

    const storageKey = 'nexora_recently_viewed_v1';
    const max = 8;

    const getList = () => {
      try{
        const raw = localStorage.getItem(storageKey);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      }catch{ return []; }
    };

    const setList = (arr) => {
      try{ localStorage.setItem(storageKey, JSON.stringify(arr.slice(0, max))); }catch{ /* ignore */ }
    };

    // Add current product
    const title = root.querySelector('[data-sticky-title]')?.textContent?.trim() || root.querySelector('.pdp-info__title')?.textContent?.trim() || 'Current product';
    const price = root.querySelector('[data-sticky-price]')?.textContent?.trim() || root.querySelector('.pdp-price')?.textContent?.trim() || '';
    const imgSrc = root.querySelector('[data-sticky-img]')?.getAttribute('src') || root.querySelector('.pdp-gallery__img')?.getAttribute('src') || '';

    const list = getList();
    const id = pdp.state.productId;
    const updated = [{ id, title, price, img: imgSrc }, ...list.filter(x => x && x.id !== id)];
    setList(updated);

    const render = () => {
      const items = getList();
      grid.innerHTML = '';

      if(!items.length){
        const empty = document.createElement('div');
        empty.className = 'pdp-recent__empty';
        empty.textContent = 'No recently viewed items yet.';
        grid.appendChild(empty);
        return;
      }

      items.slice(0, 8).forEach((it) => {
        const card = document.createElement('article');
        card.className = 'pdp-recentCard';
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-reveal', 'fade');
        card.innerHTML = `
          <button class="pdp-recentCard__wish" type="button" aria-label="Add to wishlist" data-recent-wishlist>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M12 20.2s-7.6-4.6-10-9.3C.4 7.3 2.3 4 5.7 4c2 0 3.6 1.1 4.5 2.7C11.1 5.1 12.7 4 14.7 4c3.4 0 5.3 3.3 3.7 6.9-2.4 4.7-10 9.3-10 9.3z"/>
            </svg>
          </button>
          <div class="pdp-recentCard__media" aria-hidden="true"><img src="${it.img ? it.img : ''}" alt="" loading="lazy" /></div>
          <div class="pdp-recentCard__body">
            <h3 class="pdp-recentCard__title">${it.title || ''}</h3>
            <div class="pdp-recentCard__price">${it.price ? it.price : ''}</div>
            <button class="pdp-recentCard__add" type="button" data-recent-add>Add to Cart</button>
          </div>
        `;

        grid.appendChild(card);

        if(window.NEXORA?.reveal?.observe){
          window.NEXORA.reveal.observe(card);
        } else {
          card.classList.add('reveal-in'); // reveal system not ready yet — fail safe
        }

        const addBtn = card.querySelector('[data-recent-add]');
        addBtn.addEventListener('click', () => addToCart({ id: it.id, qty: 1 }));

        const wishBtn = card.querySelector('[data-recent-wishlist]');
        wishBtn.addEventListener('click', () => {
          const isNow = toggleWishlist(it.id);
          wishBtn.classList.toggle('is-active', isNow);
        });
      });
    };

    // skeleton loading (quick)
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduced){
      const count = 4;
      for(let i=0;i<count;i++){
        const s = document.createElement('div');
        s.className = 'pdp-recentCard pdp-skeletonCard';
        s.style.height = '260px';
        s.style.borderStyle = 'dashed';
        s.style.background = 'rgba(255,255,255,0.65)';
        s.setAttribute('aria-hidden','true');
        grid.appendChild(s);
      }
      setTimeout(() => render(), 380);
    } else {
      render();
    }
  };

  // ---------- Sticky purchase bar ----------
  const initStickyBar = () => {
    const bar = root.querySelector('[data-sticky-bar]');
    if(!bar) return;
    const imgEl = bar.querySelector('[data-sticky-img]');
    const titleEl = bar.querySelector('[data-sticky-title]');
    const priceEl = bar.querySelector('[data-sticky-price]');

    const mainImg = root.querySelector('.pdp-gallery__img');
    const mainTitle = root.querySelector('.pdp-info__title');
    const mainPrice = root.querySelector('.pdp-price');

    if(imgEl && mainImg) imgEl.setAttribute('src', mainImg.getAttribute('src') || '');
    if(titleEl && mainTitle) titleEl.textContent = mainTitle.textContent.trim();
    if(priceEl && mainPrice) priceEl.textContent = money(mainPrice.textContent);

    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.position = 'absolute';
    sentinel.style.top = '110vh';
    sentinel.style.width = '1px';
    sentinel.style.height = '1px';
    root.appendChild(sentinel);

    const update = () => {
      const rect = bar.getBoundingClientRect();
      const show = window.scrollY > 520;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
  };

  // Scroll reveals on this page use [data-reveal="fade"] + the single global
  // premiumReveal observer in script.js (already loaded here) — no page-local
  // observer needed.

  // ---------- Skeleton removal for hero once image loaded ----------
  const initHeroSkeleton = () => {
    const img = root.querySelector('.pdp-gallery__img');
    const skeleton = root.querySelector('[data-skeleton-main]');
    if(!img || !skeleton) return;
    const done = () => { skeleton.style.display = 'none'; };
    if(img.complete && img.naturalWidth > 0) done();
    else img.addEventListener('load', done, { once: true });

    // If image fails, still remove skeleton after a short time.
    setTimeout(done, 900);
  };

  // ---------- Product hydration from localStorage ----------
  const initProductHydration = () => {
    // Backward compatible: if user lands here without selection, keep the current default.
    try{
      const key = 'nexora_selected_product_id';
      const raw = localStorage.getItem(key);
      if(raw && String(raw).trim()){
        pdp.state.productId = String(raw).trim();
      }else{
        ensureProductIdInStorage();
      }
    }catch(_e){ /* ignore */ }
  };

  // ---------- Init ----------
  initHeroSkeleton();
  initProductHydration();
  initGallery();
  initPurchase();
  initTabs();
  initSpecsTable();
  initReviews();
  initRelated();
  initRecentlyViewed();
  initStickyBar();
})();


