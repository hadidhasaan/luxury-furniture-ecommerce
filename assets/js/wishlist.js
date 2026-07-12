(function () {
  const root = document.querySelector('.wishlist-page');
  if (!root) return;

  const grid = root.querySelector('[data-wishlist-grid]');
  const empty = root.querySelector('[data-wishlist-empty]');
  const countEl = root.querySelector('[data-wishlist-count]');
  const addAllBtn = root.querySelector('[data-wishlist-add-all]');

  const money = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '$0';
    try {
      return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    } catch {
      return '$' + n.toFixed(2);
    }
  };

  const safeParseArray = (raw) => {
    if (!raw || typeof raw !== 'string') return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getWishlistIds = () => {
    try {
      if (window.NEXORA && Array.isArray(window.NEXORA.state?.wishlist)) return window.NEXORA.state.wishlist.slice();
    } catch (_e) {}
    return safeParseArray(window.localStorage?.getItem('nexora_wishlist') || '[]');
  };

  const setWishlistIds = (ids) => {
    try {
      if (window.NEXORA && window.NEXORA.state) {
        window.NEXORA.state.wishlist = Array.isArray(ids) ? ids : [];
      }
    } catch (_e) {}

    try {
      if (window.localStorage) {
        window.localStorage.setItem('nexora_wishlist', JSON.stringify(Array.isArray(ids) ? ids : []));
      }
    } catch (_e) {}
  };

  // Premium toast integration
  const toast = (type, message) => {
    try {
      if (window.Toast && typeof window.Toast.show === 'function') {
        window.Toast.show(type, message, { durationMs: 3200 });
      }
    } catch (_e) {}

    // Fallback (if premium Toast isn't loaded for some reason)
    try {
      const existing = document.getElementById('nexoraWishlistToast');
      if (existing) existing.remove();

      const wrap = document.createElement('div');
      wrap.id = 'nexoraWishlistToast';
      wrap.setAttribute('role', 'status');
      wrap.setAttribute('aria-live', 'polite');
      wrap.style.position = 'fixed';
      wrap.style.left = '50%';
      wrap.style.bottom = '22px';
      wrap.style.transform = 'translateX(-50%)';
      wrap.style.zIndex = '9999';
      wrap.style.padding = '12px 16px';
      wrap.style.borderRadius = '999px';
      wrap.style.background = 'rgba(255,255,255,0.95)';
      wrap.style.border = '1px solid rgba(201,164,106,0.35)';
      wrap.style.boxShadow = '0 18px 60px rgba(0,0,0,0.18)';
      wrap.style.color = 'rgba(17,17,17,0.92)';
      wrap.style.fontWeight = '700';
      wrap.style.pointerEvents = 'none';
      wrap.style.opacity = '0';
      wrap.style.transition = 'opacity 160ms var(--ease-soft, ease), transform 200ms var(--ease-soft, ease)';
      wrap.style.transform = 'translateX(-50%) translateY(10px)';
      wrap.textContent = message;
      document.body.appendChild(wrap);

      requestAnimationFrame(() => {
        wrap.style.opacity = '1';
        wrap.style.transform = 'translateX(-50%) translateY(0px)';
      });

      setTimeout(() => {
        wrap.style.opacity = '0';
        wrap.style.transform = 'translateX(-50%) translateY(12px)';
        setTimeout(() => wrap.remove(), 240);
      }, 1400);
    } catch (_e) {}
  };

  const resolveProduct = (id) => {
    if (!id || typeof id !== 'string') {
      return {
        id: '',
        title: 'Untitled Piece',
        category: 'NEXORA',
        price: 0,
        img: 'assets/img/bedroom-furniture.jpg',
        url: 'product-details.html'
      };
    }

    // Prefer persisted wishlist display data.
    // (If wishlist items were added from UI, some pages may store title/price/image/URL.)
    try {
      const raw = window.localStorage?.getItem('nexora_wishlist_products_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      const map = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : null;
      const saved = map && Object.prototype.hasOwnProperty.call(map, id) ? map[id] : null;
      if (saved && typeof saved === 'object') {
        const title = saved.title != null ? String(saved.title) : 'Untitled Piece';
        const category = saved.category != null ? String(saved.category) : 'NEXORA';
        const price = Number.isFinite(Number(saved.price)) ? Number(saved.price) : 0;
        const img = saved.img != null ? String(saved.img) : 'assets/img/bedroom-furniture.jpg';
        const url = saved.url != null ? String(saved.url) : 'product-details.html';
        return { id, title, category, price, img, url };
      }
    } catch (_e) {}

    // Also check if the app stores rich product data under cart-products key.
    // (Used by cart renderer; harmless if absent.)
    try {
      const raw = window.localStorage?.getItem('nexora_cart_products_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      const map = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : null;
      const saved = map && Object.prototype.hasOwnProperty.call(map, id) ? map[id] : null;
      if (saved && typeof saved === 'object') {
        const title = saved.title != null ? String(saved.title) : 'Untitled Piece';
        const category = saved.category != null ? String(saved.category) : 'NEXORA';
        const price = Number.isFinite(Number(saved.price)) ? Number(saved.price) : 0;
        const img = saved.img != null ? String(saved.img) : 'assets/img/bedroom-furniture.jpg';
        const url = saved.url != null ? String(saved.url) : 'product-details.html';
        return { id, title, category, price, img, url };
      }
    } catch (_e) {}


    // Backward compatibility: legacy encoding in ID
    const parts = id.split('|');
    if (parts.length >= 4) {
      const category = parts[0] || 'NEXORA';
      const priceNum = Number.parseFloat((parts[1] || '0').replace(/[^0-9.]/g, ''));
      const title = parts.slice(3).join('|') || 'Untitled Piece';
      const lower = title.toLowerCase();
      let img = 'assets/img/bedroom-furniture.jpg';
      if (lower.includes('sofa')) img = 'assets/img/sofa-set.jpg';
      else if (lower.includes('bed')) img = 'assets/img/bedroom-furniture.jpg';
      else if (lower.includes('chair')) img = 'assets/img/chairs-collection.jpg';
      else if (lower.includes('table')) img = 'assets/img/dining-table.jpg';
      return { id, title, category, price: Number.isFinite(priceNum) ? priceNum : 0, img, url: 'product-details.html' };
    }

    // Last-resort fallback (no name/price known)
    return {
      id,
      title: id.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
      category: 'NEXORA',
      price: 0,
      img: 'assets/img/bedroom-furniture.jpg',
      url: 'product-details.html'
    };
  };

  const render = () => {
    const ids = getWishlistIds();
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    setWishlistIds(uniqueIds);

    if (countEl) {
      const label = uniqueIds.length === 1 ? '1 item' : `${uniqueIds.length} items`;
      countEl.textContent = label;
    }

    if (window.NEXORA && typeof window.NEXORA.updateCounts === 'function') {
      window.NEXORA.updateCounts();
    }

    if (!uniqueIds.length) {
      if (grid) grid.innerHTML = '';
      if (empty) empty.classList.add('is-visible');
      if (addAllBtn) addAllBtn.disabled = true;
      return;
    }

    if (empty) empty.classList.remove('is-visible');
    if (addAllBtn) addAllBtn.disabled = false;

    if (!grid) return;

    grid.innerHTML = '';

    uniqueIds.forEach((id) => {
      const product = resolveProduct(id);
      const card = document.createElement('article');
      card.className = 'wishlist-card';
      card.setAttribute('data-reveal', 'fade');
      card.innerHTML = `
        <div class="wishlist-card__media">
          <img src="${product.img}" alt="${product.title}" loading="lazy" />
        </div>
        <div class="wishlist-card__content">
          <div class="wishlist-card__meta">${product.category}</div>
          <h2 class="wishlist-card__title">${product.title}</h2>
          <div class="wishlist-card__price">${money(product.price)}</div>
          <div class="wishlist-card__actions">
            <a class="wishlist-btn wishlist-btn--primary wishlist-card__action" href="${product.url}">View Product</a>
            <button class="wishlist-btn wishlist-btn--secondary wishlist-card__action" type="button" data-wishlist-add-to-cart>Add to Cart</button>
            <button class="wishlist-btn wishlist-card__remove wishlist-card__action" type="button" data-wishlist-remove>Remove</button>
          </div>
        </div>
      `;

      const addBtn = card.querySelector('[data-wishlist-add-to-cart]');
      const removeBtn = card.querySelector('[data-wishlist-remove]');

      addBtn?.addEventListener('click', () => {
        try {
          if (window.NEXORA?.cart?.add) {
            window.NEXORA.cart.add(product.id, 1);
          } else if (window.NEXORA?.state?.cart) {
            if (!window.NEXORA.state.cart.includes(product.id)) window.NEXORA.state.cart.push(product.id);
            if (window.NEXORA.updateCounts) window.NEXORA.updateCounts();
          }
          toast('success', 'Added to Cart');
        } catch (_e) {
          toast('info', 'Added to Cart');
        }
      });

      removeBtn?.addEventListener('click', () => {
        removeItem(product.id);
      });

      grid.appendChild(card);
      if(window.NEXORA?.reveal?.observe){
        window.NEXORA.reveal.observe(card);
      } else {
        card.classList.add('reveal-in'); // reveal system not ready yet — fail safe
      }
    });
  };

  const removeItem = (id) => {
    const next = getWishlistIds().filter((item) => item !== id);
    setWishlistIds(next);
    render();
    toast('success', 'Removed from Wishlist');
  };

  addAllBtn?.addEventListener('click', () => {
    const ids = getWishlistIds();
    if (!ids.length) return;
    ids.forEach((id) => {
      try {
        if (window.NEXORA?.cart?.add) {
          window.NEXORA.cart.add(id, 1);
        } else if (window.NEXORA?.state?.cart) {
          if (!window.NEXORA.state.cart.includes(id)) window.NEXORA.state.cart.push(id);
        }
      } catch (_e) {}
    });
    if (window.NEXORA?.updateCounts) window.NEXORA.updateCounts();
    toast('success', 'Added all to Cart');
  });

  const syncFromState = () => {
    try {
      const stateIds = Array.isArray(window.NEXORA?.state?.wishlist) ? window.NEXORA.state.wishlist : [];
      setWishlistIds(stateIds);
      render();
    } catch (_e) {
      render();
    }
  };

  window.addEventListener('wishlist:updated', syncFromState);
  window.addEventListener('storage', (event) => {
    if (!event || !event.key) return;
    if (event.key === 'nexora_wishlist' || event.key === 'nexora_cart') syncFromState();
  });

  window.addEventListener('cart:updated', () => {
    if (window.NEXORA && typeof window.NEXORA.updateCounts === 'function') window.NEXORA.updateCounts();
  });

  // NOTE: script.js hydrates window.NEXORA.state.wishlist from localStorage on
  // DOMContentLoaded. If this script calls syncFromState() immediately (before that
  // hydration runs), state.wishlist is still the empty default array, and
  // syncFromState() -> setWishlistIds() would overwrite localStorage with "[]",
  // wiping the saved wishlist. Deferring to DOMContentLoaded guarantees script.js's
  // hydration (registered first, since script.js loads before this file) has already
  // run by the time we sync.
  const initWishlistPage = () => {
    syncFromState();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWishlistPage, { once: true });
  } else {
    initWishlistPage();
  }
})();
