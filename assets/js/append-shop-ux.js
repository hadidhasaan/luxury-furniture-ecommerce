/*
  NEXORA — Shop UX module
  Filters/Sort/Search + Quick View + View Details

  This file is appended by script.js (vanilla JS only).
*/

(function(){
  const isShopPage = !!document.getElementById('shopItems') && !!document.getElementById('shopSort');
  if(!isShopPage) return;


  const itemsWrap = document.getElementById('shopItems');
  const cards = Array.from(itemsWrap.querySelectorAll('.shop-card'));

  const elSearch = document.getElementById('shopSearch');
const elResultCount = document.getElementById('shopResultCount');

const params = new URLSearchParams(window.location.search);
const initialSearch = params.get('search');

if (initialSearch && elSearch) {
  elSearch.value = initialSearch;
}

  const elPriceMin = document.getElementById('shopPriceMin');
  const elPriceMax = document.getElementById('shopPriceMax');
  const elSort = document.getElementById('shopSort');
  const elClear = document.getElementById('shopClear');
  const elApply = document.getElementById('shopApply');

  // Desktop rating + availability filters
  const ratingMinInputs = Array.from(document.querySelectorAll('input[name="shopRatingMin"]'));
  const stockInputs = Array.from(document.querySelectorAll('input[name="shopStock"]'));


  // Drawer rating + availability filters (mobile)
  const ratingMinInputsDrawer = Array.from(document.querySelectorAll('input[name="shopRatingMinDrawer"]'));
  const stockInputsDrawer = Array.from(document.querySelectorAll('input[name="shopStockDrawer"]'));


  const getSelectedRatingMin = () => {
    const checked = ratingMinInputs.find(i => i.checked) || ratingMinInputsDrawer.find(i => i.checked);
    const v = checked ? Number(checked.value) : 0;
    return Number.isFinite(v) ? v : 0;
  };

  const getSelectedStockStates = () => {
    const desktop = stockInputs.filter(i => i.checked).map(i => i.value);
    const drawer = stockInputsDrawer.filter(i => i.checked).map(i => i.value);
    return new Set(desktop.concat(drawer));
  };


  const getCardRating = (card) => {
    const raw = card.querySelector('.shop-card__ratingValue')?.textContent || '';
    const v = Number(String(raw).trim());
    return Number.isFinite(v) ? v : 0;
  };

  const getCardStockState = (card) => {
    return card.getAttribute('data-stock') || '';
  };









  /* ---------------- Mobile filters drawer wiring ---------------- */
  const drawer = document.getElementById('shopFiltersDrawer');
  const drawerFocusTarget = drawer?.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');

  // Drawer focus restoration / opener restoration
  let drawerLastFocus = null;

  const setDrawerOpen = (open) => {
    if(!drawer) return;
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    drawer.classList.toggle('is-open', !!open);
    document.body.style.overflow = open ? 'hidden' : '';

    const openBtn = document.getElementById('shopFiltersDrawerOpen');
    openBtn && openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');

    if(open){
      drawerLastFocus = document.activeElement;
      (drawerFocusTarget || drawer.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))?.focus?.();
    } else {
      drawerLastFocus && drawerLastFocus.focus && drawerLastFocus.focus();
    }
  };


  const drawerOpenBtn = document.getElementById('shopFiltersDrawerOpen');
  const drawerCloseBtn = document.querySelector('[data-drawer-close]');
  const drawerScrim = document.querySelector('[data-drawer-scrim]');
  const drawerClearBtn = document.getElementById('shopClearDrawer');
  const drawerApplyBtn = document.getElementById('shopApplyDrawer');

  // Desktop category filter inputs
  // (Defined early to avoid temporal dead zone risks if any function uses it.)
  const categoryInputs = Array.from(document.querySelectorAll('input[name="category"]'));



  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  drawerOpenBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openDrawer();
  });

  drawerCloseBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDrawer();
  });

  drawerScrim?.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if(!drawer || !drawer.classList.contains('is-open')) return;
    if(e.key === 'Escape') closeDrawer();
  });

  const syncDrawerToDesktop = () => {
    // Categories: copy checked states into desktop checkboxes
    const desktopCats = new Map(categoryInputs.map(i => [i.value, i]));
    Array.from(document.querySelectorAll('input[name="category"]')).forEach(i => {
      // no-op: already wired to desktop; keep for future safety
    });

    // Rating
    const desktopRatingInputs = ratingMinInputs;
    const drawerRatingInputs = ratingMinInputsDrawer;
    drawerRatingInputs.forEach(di => {
      if(di.checked){
        desktopRatingInputs.forEach(dest => { dest.checked = dest.value === di.value; });
      }
    });

    // Stock
    const desktopStockInputs = stockInputs;
    const drawerStockInputs = stockInputsDrawer;
    const selected = new Set(drawerStockInputs.filter(i => i.checked).map(i => i.value));
    desktopStockInputs.forEach(di => { di.checked = selected.has(di.value); });

    // Price + sort
    const pmn = document.getElementById('shopPriceMinDrawer');
    const pmx = document.getElementById('shopPriceMaxDrawer');
    const ps = document.getElementById('shopSortDrawer');
    if(elPriceMin && pmn) elPriceMin.value = String(pmn.value);
    if(elPriceMax && pmx) elPriceMax.value = String(pmx.value);
    if(elSort && ps) elSort.value = ps.value;
  };

  drawerClearBtn?.addEventListener('click', () => {
    // Use desktop reset then sync UI back into drawer for consistency.
    // (Desktop reset ensures rating & stock defaults match requirements.)
    resetFilters();

    // Now apply those defaults into drawer controls
    // Rating default 4.5
    ratingMinInputsDrawer.forEach(i => { i.checked = String(i.value) === '4.5'; });
    // Stock default in+low
    stockInputsDrawer.forEach(i => { i.checked = String(i.value) === 'in' || String(i.value) === 'low'; });
    // Price + sort
    const pmn = document.getElementById('shopPriceMinDrawer');
    const pmx = document.getElementById('shopPriceMaxDrawer');
    const ps = document.getElementById('shopSortDrawer');
    if(pmn && elPriceMin) pmn.value = String(elPriceMin.value);
    if(pmx && elPriceMax) pmx.value = String(elPriceMax.value);
    if(ps && elSort) ps.value = elSort.value;

    applyFiltersAndSort();
    closeDrawer();
  });

  drawerApplyBtn?.addEventListener('click', () => {
    syncDrawerToDesktop();
    applyFiltersAndSort();
    closeDrawer();
  });

  // Desktop category filter inputs
  // (already defined above as categoryInputs)
  const readPrice = (el) => {
    if(!el) return 0;
    const v = Number(el.value);
    return Number.isFinite(v) ? v : 0;
  };

  const getSelectedCategories = () => new Set(categoryInputs.filter(i => i.checked).map(i => i.value));

  const getCardText = (card) => {
    const title = card.querySelector('.shop-card__title')?.textContent || '';
    const desc = card.querySelector('.shop-card__desc')?.textContent || '';
    const category = card.getAttribute('data-category') || '';
    return (title + ' ' + desc + ' ' + category).toLowerCase();
  };

  const elPagination = document.getElementById('shopPagination');
  const elPagePrev = document.getElementById('shopPagePrev');
  const elPageNext = document.getElementById('shopPageNext');
  const elPageNumbers = document.getElementById('shopPageNumbers');

  const PAGE_SIZE = 8;

  let activePage = 1;
  let lastResultCards = [];

  const noResultsEl = document.getElementById('shopNoResults');


  const getPaginationTopAnchor = () => {
    // Scroll to the start of the products section after page change.
    // Prefer the grid top padding area if available.
    const section = document.querySelector('.shop-grid');
    return section || itemsWrap;
  };

  const scrollToProductsTop = () => {
    const anchor = getPaginationTopAnchor();
    if(!anchor) return;

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if(reduced){
      anchor.scrollIntoView();
      return;
    }

    // Smooth scroll aligned with luxury UX.
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderPage = () => {
    const total = lastResultCards.length;

    if(noResultsEl){
      const isNo = total === 0;
      noResultsEl.hidden = !isNo;
      // Keep pagination visually quiet when empty.
      if(elPagination){
        elPagination.classList.toggle('is-hidden', isNo);
      }
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    activePage = Math.min(Math.max(1, activePage), totalPages);

    const start = (activePage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageCards = lastResultCards.slice(start, end);

    const fragment = document.createDocumentFragment();
    pageCards.forEach(({ card }) => fragment.appendChild(card));
    itemsWrap.replaceChildren(fragment);

    if(elPagination){
      // Pagination hidden when fewer than a full page OR no results.
      elPagination.classList.toggle('is-hidden', total === 0 || total <= PAGE_SIZE);
    }


    if(elPagePrev) elPagePrev.disabled = total === 0 || activePage <= 1;
    if(elPageNext) elPageNext.disabled = total === 0 || activePage >= totalPages;


    if(elPageNumbers){
      elPageNumbers.innerHTML = '';

      if(total === 0){
        // No pages to render.
        return;
      }

      // Premium pagination: show a window around active page.
      const maxButtons = 7;

      const half = Math.floor(maxButtons / 2);

      let windowStart = Math.max(1, activePage - half);
      let windowEnd = Math.min(totalPages, windowStart + maxButtons - 1);
      windowStart = Math.max(1, windowEnd - maxButtons + 1);

      const addBtn = (pageNum, labelText = String(pageNum)) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'shop-page-btn' + (pageNum === activePage ? ' is-active' : '');
        btn.setAttribute('aria-label', `Page ${pageNum}`);
        btn.setAttribute('aria-current', pageNum === activePage ? 'page' : 'false');
        btn.textContent = labelText;
        btn.addEventListener('click', () => {
          if(pageNum === activePage) return;
          activePage = pageNum;
          renderPage();
          scrollToProductsTop();
        });
        return btn;
      };

      if(totalPages > maxButtons && windowStart > 1){
        elPageNumbers.appendChild(addBtn(1, '1'));
        if(windowStart > 2){
          const dots = document.createElement('span');
          dots.className = 'shop-pagination__dots';
          dots.setAttribute('aria-hidden', 'true');
          dots.textContent = '…';
          elPageNumbers.appendChild(dots);
        }
      }

      for(let p = windowStart; p <= windowEnd; p++){
        elPageNumbers.appendChild(addBtn(p));
      }

      if(totalPages > maxButtons && windowEnd < totalPages){
        if(windowEnd < totalPages - 1){
          const dots = document.createElement('span');
          dots.className = 'shop-pagination__dots';
          dots.setAttribute('aria-hidden', 'true');
          dots.textContent = '…';
          elPageNumbers.appendChild(dots);
        }
        elPageNumbers.appendChild(addBtn(totalPages, String(totalPages)));
      }
    }

    // Keep hidden state consistent for screen readers / existing filtering logic.
    // Cards not in current view remain in DOM-less state; we preserve visibility.
    lastResultCards.forEach(({ card, visible }) => {
      // Use hidden only for accessibility; DOM has only current page cards.
      // For correct semantics, leave hidden=false on current page cards and true on others.
      card.hidden = visible ? false : true;
    });
  };

  const setActivePageAndRender = (pageNum) => {
    activePage = pageNum;
    renderPage();
    scrollToProductsTop();
  };

  elPagePrev?.addEventListener('click', () => {
    if(elPagePrev?.disabled) return;
    setActivePageAndRender(activePage - 1);
  });

  elPageNext?.addEventListener('click', () => {
    if(elPageNext?.disabled) return;
    setActivePageAndRender(activePage + 1);
  });

  document.addEventListener('keydown', (e) => {
    if(!elPagination || elPagination.classList.contains('is-hidden')) return;
    // Only handle when focus is inside pagination controls.
    if(!document.activeElement) return;
    if(!elPagination.contains(document.activeElement)) return;

    if(e.key === 'ArrowLeft'){
      if(elPagePrev && !elPagePrev.disabled){
        e.preventDefault();
        setActivePageAndRender(activePage - 1);
      }
    } else if(e.key === 'ArrowRight'){
      if(elPageNext && !elPageNext.disabled){
        e.preventDefault();
        setActivePageAndRender(activePage + 1);
      }
    }
  });

  const applyFiltersAndSort = () => {
    const q = (elSearch?.value || '').trim().toLowerCase();
    const selectedCats = getSelectedCategories();
    const min = readPrice(elPriceMin);
    const max = readPrice(elPriceMax);
    const sortMode = elSort?.value || 'newest';

    const ratingMin = getSelectedRatingMin();
    const selectedStockStates = getSelectedStockStates();

    const parsed = cards.map(card => {
      const category = card.getAttribute('data-category') || '';
      const price = Number(card.getAttribute('data-price'));
      const dateStr = card.getAttribute('data-date');
      const date = dateStr ? new Date(dateStr + 'T00:00:00') : null;
      const text = getCardText(card);

      const categoryOk = selectedCats.has(category);
      const priceOk = Number.isFinite(price) ? price >= min && price <= max : false;
      const searchOk = !q ? true : text.includes(q);

      const ratingOk = ratingMin > 0 ? getCardRating(card) >= ratingMin : true;
      const stockState = getCardStockState(card);
      const stockOk = selectedStockStates.size ? selectedStockStates.has(stockState) : true;

      const visible = categoryOk && priceOk && searchOk && ratingOk && stockOk;
      return { card, visible, price, date: date ? date.getTime() : 0 };
    });

    // Maintain existing behavior but with pagination.
    parsed.forEach(({ card, visible }) => { card.style.display = visible ? '' : 'none'; });

    const visibleCards = parsed.filter(x => x.visible);

    if(sortMode === 'low') visibleCards.sort((a,b) => a.price - b.price);
    else if(sortMode === 'high') visibleCards.sort((a,b) => b.price - a.price);
    else visibleCards.sort((a,b) => b.date - a.date);

    // Store lastResultCards to page through.
    lastResultCards = visibleCards;

    // Reset to page 1 after filtering/searching.
    activePage = 1;

    // Render first page.
    renderPage();

    if(elResultCount){
      elResultCount.textContent = `${visibleCards.length} item${visibleCards.length === 1 ? '' : 's'}`;
    }
  };


  const resetFilters = () => {
    categoryInputs.forEach(i => i.checked = true);
    if(elPriceMin) elPriceMin.value = '0';
    if(elPriceMax) elPriceMax.value = '5000';
    if(elSort) elSort.value = 'newest';
    if(elSearch) elSearch.value = '';

    // Rating reset: 4.5 up
    ratingMinInputs.forEach(i => { i.checked = String(i.value) === '4.5'; });

    // Stock reset: In + Low (leave Sold Out unchecked)
    stockInputs.forEach(i => {
      i.checked = String(i.value) === 'in' || String(i.value) === 'low';
    });
  }; 


  elApply?.addEventListener('click', applyFiltersAndSort);
  elClear?.addEventListener('click', () => { resetFilters(); applyFiltersAndSort(); });

  let t = null;
  elSearch?.addEventListener('input', () => {
    if(t) clearTimeout(t);
    t = setTimeout(applyFiltersAndSort, 120);
  });

  applyFiltersAndSort();

  /* ---------------- Modal system ---------------- */
  const buildModalOnce = () => {
    if(document.getElementById('nexoraProductModal')) return;

    const modal = document.createElement('div');
    modal.id = 'nexoraProductModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
      <div class="nexora-modal__scrim" data-scrim></div>
      <div class="nexora-modal__panel" role="document" aria-label="Product modal">
        <button class="nexora-modal__close" type="button" aria-label="Close modal" data-close>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6L6 18"/>
            <path d="M6 6l12 12"/>
          </svg>
        </button>

        <div class="nexora-modal__grid">
          <div class="nexora-modal__media">
            <div class="nexora-modal__mediaFrame" aria-hidden="true"><div class="nexora-modal__mediaGlow"></div></div>
            <img class="nexora-modal__img" alt="Product image" loading="eager" />
          </div>

          <div class="nexora-modal__content">
            <div class="nexora-modal__metaRow">
              <span class="nexora-modal__pill" data-category></span>
              <span class="nexora-modal__date" data-date></span>
            </div>
            <h2 class="nexora-modal__title" data-title></h2>
            <div class="nexora-modal__priceRow">
              <span class="nexora-modal__price" data-price></span>
              <span class="nexora-modal__oldPrice" data-old-price></span>
            </div>
            <p class="nexora-modal__desc" data-desc></p>

            <div class="nexora-modal__actions" role="group" aria-label="Modal actions">
              <button class="shop-btn shop-btn--ghost nexora-modal__actionWish" type="button" data-wishlist-action>Add to Wishlist</button>
              <button class="shop-btn shop-btn--primary nexora-modal__actionCart" type="button" data-cart-action>Add to Cart</button>
            </div>

            <div class="nexora-modal__divider" aria-hidden="true"></div>

            <section class="nexora-modal__details" data-details>
              <h3 class="nexora-modal__detailsTitle">Details</h3>
              <ul class="nexora-modal__list" aria-label="Product details list">
                <li><span class="nexora-modal__k">Category</span><span class="nexora-modal__v" data-detail-category></span></li>
                <li><span class="nexora-modal__k">Price</span><span class="nexora-modal__v" data-detail-price></span></li>
                <li><span class="nexora-modal__k">Release</span><span class="nexora-modal__v" data-detail-date></span></li>
              </ul>
              <p class="nexora-modal__fine" data-fine>Premium materials, refined craftsmanship, and a silhouette designed to elevate everyday living.</p>
            </section>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const style = document.createElement('style');
    style.id = 'nexora-modal-style';
    style.textContent = `
      .nexora-modal__scrim{position:fixed;inset:0;background:rgba(0,0,0,0.42);opacity:0;visibility:hidden;transition:opacity .45s var(--ease-soft),visibility .45s var(--ease-soft);z-index:2000;}
      .nexora-modal__panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-46%) scale(.98);width:min(980px,calc(100vw - 28px));max-height:min(82vh,760px);overflow:auto;background:rgba(255,255,255,0.90);border:1px solid rgba(234,231,224,0.95);border-radius:22px;box-shadow:0 60px 140px -70px rgba(0,0,0,0.65);backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);z-index:2001;opacity:0;transition:opacity .45s var(--ease-soft),transform .6s var(--ease),filter .45s var(--ease-soft);filter:blur(6px);}
      .nexora-modal__close{position:absolute;top:14px;right:14px;width:44px;height:44px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(17,17,17,0.10);background:rgba(255,255,255,0.78);color:rgba(17,17,17,0.72);transition:transform .25s var(--ease),border-color .25s var(--ease),background .25s var(--ease);z-index:2;}
      .nexora-modal__close:hover{transform:translateY(-1px);border-color:rgba(201,164,106,0.55);background:rgba(201,164,106,0.10);color:rgba(17,17,17,0.92);}
      .nexora-modal__close svg{width:18px;height:18px;}
      .nexora-modal__grid{display:grid;grid-template-columns:1.05fr 1fr;gap:18px;padding:22px;}
      .nexora-modal__media{position:relative;}
      .nexora-modal__mediaFrame{position:absolute;inset:-12px -12px -12px -12px;border-radius:18px;background:radial-gradient(700px 220px at 30% 10%, rgba(201,164,106,0.25), rgba(201,164,106,0) 58%),linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 100%);pointer-events:none;opacity:.9;}
      .nexora-modal__mediaGlow{position:absolute;inset:0;background:radial-gradient(280px 160px at 60% 20%, rgba(201,164,106,0.20), rgba(201,164,106,0) 60%);filter:blur(2px);pointer-events:none;}
      .nexora-modal__img{width:100%;height:100%;aspect-ratio:4 / 3;object-fit:cover;border-radius:18px;border:1px solid rgba(234,231,224,0.95);box-shadow:0 24px 70px -55px rgba(0,0,0,0.55);position:relative;z-index:1;}
      .nexora-modal__content{padding:14px 6px 6px;}
      .nexora-modal__metaRow{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
      .nexora-modal__pill{font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(201,164,106,0.95);background:rgba(201,164,106,0.10);border:1px solid rgba(201,164,106,0.25);padding:7px 10px;border-radius:999px;}
      .nexora-modal__date{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:900;color:rgba(58,58,58,0.62);}
      .nexora-modal__title{margin:14px 0 10px;font-family:var(--font-display);font-weight:500;letter-spacing:-.01em;color:var(--ink);font-size:clamp(24px,2.5vw,36px);line-height:1.12;}
      .nexora-modal__priceRow{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
      .nexora-modal__price{font-weight:900;font-size:20px;color:rgba(17,17,17,0.92);}
      .nexora-modal__oldPrice{font-weight:800;font-size:13px;color:rgba(17,17,17,0.45);text-decoration:line-through;}
      .nexora-modal__desc{margin:0 0 18px;font-size:14.5px;line-height:1.75;color:rgba(58,58,58,0.78);}
      .nexora-modal__actions{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
      .nexora-modal__actionWish,.nexora-modal__actionCart{height:44px;}
      .nexora-modal__actionWish{flex:1 1 160px;}
      .nexora-modal__actionCart{flex:1 1 160px;}
      .nexora-modal__divider{height:1px;background:rgba(234,231,224,0.95);margin:16px 0;}
      .nexora-modal__detailsTitle{margin:0 0 10px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;font-weight:900;color:rgba(201,164,106,0.95);}
      .nexora-modal__list{margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
      .nexora-modal__list li{display:flex;align-items:center;justify-content:space-between;gap:12px;}
      .nexora-modal__k{font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:900;color:rgba(58,58,58,0.62);}
      .nexora-modal__v{font-size:13.5px;font-weight:800;color:rgba(17,17,17,0.86);}
      .nexora-modal__fine{margin:14px 0 0;font-size:12.8px;line-height:1.7;color:rgba(58,58,58,0.62);}
      #nexoraProductModal.is-open .nexora-modal__scrim{opacity:1;visibility:visible;}
      #nexoraProductModal.is-open .nexora-modal__panel{opacity:1;transform:translate(-50%,-50%) scale(1);filter:blur(0);}
      @media (max-width:860px){.nexora-modal__grid{grid-template-columns:1fr;padding:16px;}.nexora-modal__content{padding:6px 2px 2px;}.nexora-modal__img{aspect-ratio:16 / 10;}}
      @media (prefers-reduced-motion:reduce){.nexora-modal__scrim,.nexora-modal__panel{transition:none;}}
    `;
    document.head.appendChild(style);
  };

  buildModalOnce();
  const modal = document.getElementById('nexoraProductModal');
  const scrim = modal.querySelector('[data-scrim]');
  const closeBtn = modal.querySelector('[data-close]');

  let lastFocus = null;
  let activeCard = null;

  const formatDate = (dateStr) => {
    if(!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if(Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  };

  const extractProductData = (card) => {
    const title = card.querySelector('.shop-card__title')?.textContent?.trim() || '';
    const desc = card.querySelector('.shop-card__desc')?.textContent?.trim() || '';
    const category = card.getAttribute('data-category') || '';
    const date = card.getAttribute('data-date') || '';
    const img = card.querySelector('.shop-card__img')?.getAttribute('src') || '';
    const priceText = card.querySelector('.shop-card__price')?.textContent?.trim() || '';
    const oldPriceText = card.querySelector('.shop-card__old')?.textContent?.trim() || '';
    return { title, desc, category, date, img, priceText, oldPriceText };
  };

  const setModalContent = (card, mode) => {
    activeCard = card;
    const data = extractProductData(card);

    modal.querySelector('[data-category]').textContent = data.category;
    modal.querySelector('[data-date]').textContent = data.date ? formatDate(data.date) : '';
    modal.querySelector('[data-title]').textContent = data.title;
    modal.querySelector('[data-price]').textContent = data.priceText;

    const oldEl = modal.querySelector('[data-old-price]');
    if(data.oldPriceText){ oldEl.textContent = data.oldPriceText; oldEl.style.display = ''; }
    else { oldEl.textContent = ''; oldEl.style.display = 'none'; }

    modal.querySelector('[data-desc]').textContent = data.desc;

    const imgEl = modal.querySelector('.nexora-modal__img');
    if(imgEl){ imgEl.src = data.img; imgEl.alt = data.title ? data.title + ' image' : 'Product image'; }

    modal.querySelector('[data-detail-category]').textContent = data.category;
    modal.querySelector('[data-detail-price]').textContent = data.priceText;
    modal.querySelector('[data-detail-date]').textContent = data.date ? formatDate(data.date) : '';

    const detailsSection = modal.querySelector('[data-details]');
    if(detailsSection) detailsSection.style.display = mode === 'details' ? '' : 'none';
  };

  const openModal = (card, mode) => {
    lastFocus = document.activeElement;
    setModalContent(card, mode);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn && closeBtn.focus();
  };

  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if(lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    activeCard = null;
  };

  scrim?.addEventListener('click', closeModal);
  closeBtn?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if(!modal.classList.contains('is-open')) return;
    if(e.key === 'Escape') closeModal();
    if(e.key === 'Tab'){
      const focusables = Array.from(modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled'));
      if(!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if(e.shiftKey && active === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && active === last){ e.preventDefault(); first.focus(); }
    }
  });

  itemsWrap.addEventListener('click', (e) => {
    const quick = e.target.closest('[data-quick-view]');
    const details = e.target.closest('[data-view-details]');
    if(quick){ e.preventDefault(); const card = quick.closest('.shop-card'); if(card) openModal(card, 'quick'); }
    if(details){ e.preventDefault(); const card = details.closest('.shop-card'); if(card) openModal(card, 'details'); }
  });

  const toggleInArray = (arr, id) => {
    const idx = arr.indexOf(id);
    if(idx >= 0) arr.splice(idx, 1);
    else arr.push(id);
  };

  const getCardId = (card) => {
    const title = card.querySelector('.shop-card__title')?.textContent?.trim() || '';
    return [card.getAttribute('data-category'), card.getAttribute('data-price'), card.getAttribute('data-date'), title].join('|');
  };

  modal.querySelector('[data-wishlist-action]')?.addEventListener('click', () => {
    if(!activeCard) return;
    const id = getCardId(activeCard);
    toggleInArray(window.NEXORA.state.wishlist, id);
    window.NEXORA.updateCounts && window.NEXORA.updateCounts();

    const wishBtn = activeCard.querySelector('[data-wishlist]');
    if(wishBtn) wishBtn.classList.toggle('is-active', window.NEXORA.state.wishlist.includes(id));
  });

  modal.querySelector('[data-cart-action]')?.addEventListener('click', () => {
    if(!activeCard) return;
    const id = getCardId(activeCard);
    const inCart = window.NEXORA.state.cart.includes(id);
    if(window.NEXORA.cart && typeof window.NEXORA.cart.add === 'function'){
      if(inCart) window.NEXORA.cart.remove(id);
      else window.NEXORA.cart.add(id, 1);
    } else {
      // Fallback: mutate in place (splice/push) so the persisted array reference stays intact.
      if(inCart){
        const idx = window.NEXORA.state.cart.indexOf(id);
        if(idx >= 0) window.NEXORA.state.cart.splice(idx, 1);
      } else {
        window.NEXORA.state.cart.push(id);
      }
      window.NEXORA.updateCounts && window.NEXORA.updateCounts();
    }
  });

  itemsWrap.addEventListener('click', (e) => {
    const wish = e.target.closest('[data-wishlist]');
    const cart = e.target.closest('[data-cart]');
    if(!wish && !cart) return;

    const card = (wish || cart).closest('.shop-card');
    if(!card) return;

    const id = getCardId(card);

    if(wish){
      toggleInArray(window.NEXORA.state.wishlist, id);
      wish.classList.toggle('is-active', window.NEXORA.state.wishlist.includes(id));
      window.NEXORA.updateCounts && window.NEXORA.updateCounts();
    }

    if(cart){
      const inCart = window.NEXORA.state.cart.includes(id);
      if(window.NEXORA.cart && typeof window.NEXORA.cart.add === 'function'){
        if(inCart) window.NEXORA.cart.remove(id);
        else window.NEXORA.cart.add(id, 1);
        cart.classList.toggle('is-active', !inCart);
      } else {
        // Fallback: mutate in place (splice/push) so the persisted array reference stays intact.
        if(inCart){
          const idx = window.NEXORA.state.cart.indexOf(id);
          if(idx >= 0) window.NEXORA.state.cart.splice(idx, 1);
        } else {
          window.NEXORA.state.cart.push(id);
        }
        cart.classList.toggle('is-active', !inCart);
        window.NEXORA.updateCounts && window.NEXORA.updateCounts();
      }
    }
  });
})();

