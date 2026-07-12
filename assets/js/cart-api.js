/* =====================================================
   NEXORA — Unified Cart API (self-contained)

   Goals:
   - Single authoritative cart mutation flow
   - Prevent duplicate entries; merge by increasing quantity
   - Maintain BOTH:
       window.NEXORA.state.cart      (unique IDs)
       window.NEXORA.state.cartQty   (id -> qty)
     + Persist to localStorage:
       nexora_cart (ids)
       nexora_cart_qty_v1 (qty map)
   - Dispatch cart:updated events and refresh navbar counters
   - Accessible, defensive, no console errors
===================================================== */

(function () {
  try {
    const NEXORA = window.NEXORA = window.NEXORA || { state: { cart: [], wishlist: [] } };
    NEXORA.state = NEXORA.state || { cart: [], wishlist: [] };

    if (!Array.isArray(NEXORA.state.cart)) NEXORA.state.cart = [];
    if (!NEXORA.state.cartQty || typeof NEXORA.state.cartQty !== 'object' || Array.isArray(NEXORA.state.cartQty)) {
      NEXORA.state.cartQty = {};
    }
    if (!Array.isArray(NEXORA.state.wishlist)) NEXORA.state.wishlist = [];

    const CART_IDS_KEY = 'nexora_cart';
    const CART_QTY_KEY = 'nexora_cart_qty_v1';

    const safeParseJSON = (raw, fallback) => {
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch {
        return fallback;
      }
    };

    const safeReadLS = (key) => {
      try {
        if (!window.localStorage) return null;
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    };

    const safeWriteLS = (key, value) => {
      try {
        if (!window.localStorage) return false;
        window.localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    };

    const clampQty = (n) => {
      const v = Number(n);
      if (!Number.isFinite(v)) return 1;
      const q = Math.floor(v);
      if (q < 1) return 0;
      return Math.max(1, Math.min(99, q));
    };

    const dispatchCartUpdated = () => {
      try {
        window.dispatchEvent(new CustomEvent('cart:updated'));
      } catch {
        // ignore
      }
      try {
        if (typeof NEXORA.updateCounts === 'function') NEXORA.updateCounts();
      } catch {
        // ignore
      }
    };

    // Premium toast (non-blocking)
    const showToast = (message, type = 'success') => {
      try {
        // Reuse if already created
        const existing = document.getElementById('nexoraCartToast');
        if (existing) existing.remove();

        const wrap = document.createElement('div');
        wrap.id = 'nexoraCartToast';
        wrap.setAttribute('role', 'status');
        wrap.setAttribute('aria-live', 'polite');
        wrap.style.position = 'fixed';
        wrap.style.left = '50%';
        wrap.style.bottom = '22px';
        wrap.style.transform = 'translateX(-50%)';
        wrap.style.zIndex = '9999';
        wrap.style.pointerEvents = 'none';
        wrap.style.padding = '12px 16px';
        wrap.style.borderRadius = '999px';
        wrap.style.background = 'rgba(255,255,255,0.90)';
        wrap.style.border = '1px solid rgba(201,164,106,0.35)';
        wrap.style.backdropFilter = 'blur(18px) saturate(150%)';
        wrap.style.webkitBackdropFilter = 'blur(18px) saturate(150%)';
        wrap.style.boxShadow = '0 18px 60px rgba(0,0,0,0.18)';
        wrap.style.color = 'rgba(17,17,17,0.92)';
        wrap.style.fontFamily = 'var(--font-display, Manrope), system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        wrap.style.fontWeight = '700';
        wrap.style.letterSpacing = '-0.01em';
        wrap.style.opacity = '0';
        wrap.style.transition = 'opacity 160ms var(--ease-soft, ease), transform 200ms var(--ease-soft, ease)';
        wrap.style.transform = 'translateX(-50%) translateY(10px)';

        wrap.innerHTML = `✦ ${String(message || '').trim() || 'Added to cart'}`;
        document.body.appendChild(wrap);

        requestAnimationFrame(() => {
          wrap.style.opacity = '1';
          wrap.style.transform = 'translateX(-50%) translateY(0px)';
        });

        setTimeout(() => {
          wrap.style.opacity = '0';
          wrap.style.transform = 'translateX(-50%) translateY(12px)';
          setTimeout(() => {
            try {
              wrap.remove();
            } catch {
              // ignore
            }
          }, 240);
        }, 1400);
      } catch {
        // ignore
      }
    };

    const ensureHydratedQty = () => {
      // In case this module loads before script.js persistence hydrated qty
      try {
        const raw = safeReadLS(CART_QTY_KEY);
        if (!raw) return;
        const parsed = safeParseJSON(raw, null);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
        NEXORA.state.cartQty = parsed;
      } catch {
        // ignore
      }
    };

    const ensureHydratedIds = () => {
      try {
        const raw = safeReadLS(CART_IDS_KEY);
        if (!raw) return;
        const parsed = safeParseJSON(raw, []);
        if (!Array.isArray(parsed)) return;
        NEXORA.state.cart = parsed;
      } catch {
        // ignore
      }
    };

    const syncQtyMapFromIds = () => {
      // Guarantee every id in cart has qty>=1
      const qtyMap = NEXORA.state.cartQty || {};
      let changed = false;
      for (const id of NEXORA.state.cart) {
        if (!Object.prototype.hasOwnProperty.call(qtyMap, id)) {
          qtyMap[id] = 1;
          changed = true;
        }
      }
      // Remove qty entries for ids no longer in cart
      const cartSet = new Set(NEXORA.state.cart);
      for (const key of Object.keys(qtyMap)) {
        if (!cartSet.has(key)) {
          delete qtyMap[key];
          changed = true;
        }
      }
      if (changed) NEXORA.state.cartQty = qtyMap;
    };

    const persist = () => {
      // Persist both ids and qty map.
      try {
        safeWriteLS(CART_IDS_KEY, JSON.stringify(NEXORA.state.cart));
      } catch {
        // ignore
      }
      try {
        safeWriteLS(CART_QTY_KEY, JSON.stringify(NEXORA.state.cartQty || {}));
      } catch {
        // ignore
      }
    };

    const add = (productId, quantity, productData) => {
      // IMPORTANT: keep IDs stable (shop.html uses numeric IDs: 1..24)
      const id = String(productId || '').trim();
      if (!id) return { ok: false, error: 'Missing productId' };

      ensureHydratedIds();
      ensureHydratedQty();

      // --- Persist product display data so cart renderer always has title/price ---
      // Product map stored in: nexora_cart_products_v1
      if (!NEXORA.state.cartProducts || typeof NEXORA.state.cartProducts !== 'object' || Array.isArray(NEXORA.state.cartProducts)) {
        NEXORA.state.cartProducts = {};
      }

      try {
        const rawProducts = safeReadLS('nexora_cart_products_v1');
        const parsed = rawProducts ? safeParseJSON(rawProducts, {}) : {};
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          NEXORA.state.cartProducts = parsed;
        }
      } catch { /* ignore */ }

      if (productData && typeof productData === 'object') {
        const safe = {
          title: productData.title != null ? String(productData.title) : 'Unknown item',
          category: productData.category != null ? String(productData.category) : '—',
          price: Number.isFinite(Number(productData.price)) ? Number(productData.price) : 0,
          img: productData.img != null ? String(productData.img) : '',
          url: productData.url != null ? String(productData.url) : 'product-details.html'
        };
        NEXORA.state.cartProducts[id] = safe;
        try {
          safeWriteLS('nexora_cart_products_v1', JSON.stringify(NEXORA.state.cartProducts));
        } catch { /* ignore */ }
      }

      if (!NEXORA.state.cartQty || typeof NEXORA.state.cartQty !== 'object' || Array.isArray(NEXORA.state.cartQty)) {
        NEXORA.state.cartQty = {};
      }

      const qAdd = clampQty(quantity || 1);
      if (qAdd <= 0) return { ok: false, error: 'Invalid quantity' };

      const qtyMap = NEXORA.state.cartQty;
      const existingQty = Object.prototype.hasOwnProperty.call(qtyMap, id) ? clampQty(qtyMap[id]) : 0;

      const nextQty = clampQty((existingQty || 0) + qAdd);

      if (!NEXORA.state.cart.includes(id)) {
        NEXORA.state.cart.push(id);
      }

      qtyMap[id] = nextQty;
      NEXORA.state.cartQty = qtyMap;
      syncQtyMapFromIds();
      persist();
      dispatchCartUpdated();

      showToast(`Added to cart — qty ${nextQty}`, 'success');
      return { ok: true, id, quantity: nextQty };
    };

    const remove = (productId) => {
      const id = String(productId || '').trim();
      if (!id) return { ok: false };

      ensureHydratedIds();
      ensureHydratedQty();

      const idx = NEXORA.state.cart.indexOf(id);
      if (idx >= 0) NEXORA.state.cart.splice(idx, 1);
      if (NEXORA.state.cartQty && Object.prototype.hasOwnProperty.call(NEXORA.state.cartQty, id)) {
        delete NEXORA.state.cartQty[id];
      }

      persist();
      dispatchCartUpdated();
      try { showToast('Removed from cart', 'success'); } catch {}
      return { ok: true };
    };

    const updateQuantity = (productId, quantity) => {
      const id = String(productId || '').trim();
      if (!id) return { ok: false };

      const q = clampQty(quantity || 1);
      if (q <= 0) return remove(id);

      ensureHydratedIds();
      ensureHydratedQty();

      if (!NEXORA.state.cart.includes(id)) NEXORA.state.cart.push(id);
      NEXORA.state.cartQty[id] = q;

      syncQtyMapFromIds();
      persist();
      dispatchCartUpdated();
      showToast(`Quantity updated — qty ${q}`, 'success');
      return { ok: true, id, quantity: q };
    };

    const clear = () => {
      NEXORA.state.cart = [];
      NEXORA.state.cartQty = {};
      persist();
      dispatchCartUpdated();
      try { showToast('Cart cleared', 'info'); } catch {}
      return { ok: true };
    };

    const getItems = () => {
      const qtyMap = NEXORA.state.cartQty || {};
      return NEXORA.state.cart.map((id) => ({ id, qty: clampQty(qtyMap[id] || 1) || 1 }));
    };

    const getCount = () => {
      const qtyMap = NEXORA.state.cartQty || {};
      return NEXORA.state.cart.reduce((acc, id) => acc + (clampQty(qtyMap[id] || 1) || 1), 0);
    };

    const sync = () => {
      ensureHydratedIds();
      ensureHydratedQty();
      syncQtyMapFromIds();
      persist();
      dispatchCartUpdated();
    };

    NEXORA.cart = {
      add,
      remove,
      updateQuantity,
      clear,
      getItems,
      getCount,
      sync
    };

    // initial sync best-effort
    try {
      sync();
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
})();

