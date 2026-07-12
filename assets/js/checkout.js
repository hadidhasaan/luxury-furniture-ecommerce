/* =====================================================
   NEXORA — Checkout
   Visual checkout UI + order summary totals.

   Constraints:
   - Does NOT modify cart/wishlist logic.
   - Defensive, no console errors.

   Data sources:
   - window.NEXORA.state.cart (array of ids)
   - localStorage key: nexora_cart_qty_v1 (id -> qty)
===================================================== */

(function(){
  const root = document.querySelector('.checkout-root');
  if(!root) return;

  const lsQtyKey = 'nexora_cart_qty_v1';

  const els = {
    subtotal: root.querySelector('[data-checkout-subtotal]'),
    tax: root.querySelector('[data-checkout-tax]'),
    total: root.querySelector('[data-checkout-total]'),
    itemsTitle: root.querySelector('[data-checkout-items-title]'),
    status: root.querySelector('[data-checkout-status]'),
    placeOrder: root.querySelector('[data-checkout-placeorder]'),
    form: root.querySelector('#checkoutForm'),
    paymentGrid: root.querySelector('.checkout-paymentGrid')
  };

  const money = (n) => {
    const v = Number(n);
    if(!Number.isFinite(v)) return '$0';
    try{
      return v.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }catch{
      return '$' + v.toFixed(2);
    }
  };

  const clampQty = (n) => {
    const v = Number(n);
    if(!Number.isFinite(v)) return 1;
    const q = Math.floor(v);
    if(q < 1) return 0;
    return Math.max(1, Math.min(99, q));
  };

  const getQtyMap = () => {
    // Prefer state map if exists; fallback to localStorage
    try{
      const m = window.NEXORA?.state?.cartQty;
      if(m && typeof m === 'object' && !Array.isArray(m)) return m;
    }catch(_e){}

    try{
      const raw = localStorage.getItem(lsQtyKey);
      const parsed = raw ? JSON.parse(raw) : {};
      if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    }catch(_e){}

    return {};
  };

  const safeCartIds = () => {
    try{
      const cart = window.NEXORA?.state?.cart;
      if(Array.isArray(cart)) return cart.slice();
    }catch(_e){}

    // No backend cart array fallback without breaking constraints.
    return [];
  };

  // Minimal resolver to estimate prices from supported cart ids.
  // Matches the heuristic from cart.js to keep subtotal consistent.
  const parsePriceFromCartId = (id) => {
    if(!id || typeof id !== 'string') return 0;

    const parts = id.split('|');
    if(parts.length >= 4){
      const priceNum = parseFloat(String(parts[1] || '0').replace(/[^0-9.]/g,''));
      return Number.isFinite(priceNum) ? priceNum : 0;
    }

    // Known PDP product (product-details.html is currently a single static product page)
    if(id === 'pdp-sable-platform-bed' || id === 'sable-platform-bed') return 1899;

    return 0;
  };

  const computeTotals = () => {
    const cart = safeCartIds();
    const qtyMap = getQtyMap();

    if(!cart.length){
      return { itemsCount: 0, subtotal: 0, tax: 0, total: 0 };
    }

    let itemsCount = 0;
    let subtotal = 0;

    for(const id of cart){
      const qtyRaw = Object.prototype.hasOwnProperty.call(qtyMap, id) ? qtyMap[id] : 1;
      const qty = clampQty(qtyRaw) || 1;
      itemsCount += qty;

      const price = parsePriceFromCartId(id);
      subtotal += (price || 0) * qty;
    }

    const tax = subtotal * 0.07; // estimated
    const total = subtotal + tax;

    return { itemsCount, subtotal, tax, total };
  };

  const render = () => {
    const t = computeTotals();

    if(els.itemsTitle){
      const label = t.itemsCount === 1 ? '1 item' : `${t.itemsCount} items`;
      els.itemsTitle.textContent = label;
    }

    if(els.subtotal) els.subtotal.textContent = money(t.subtotal);
    if(els.tax) els.tax.textContent = money(t.tax);
    if(els.total) els.total.textContent = money(t.total);

    if(els.status){
      const empty = t.itemsCount <= 0;
      els.status.textContent = empty ? '' : 'Ready when you are — order confirmation is a demo.';
    }

    // Update button disabled state
    if(els.placeOrder){
      const empty = t.itemsCount <= 0;
      els.placeOrder.disabled = empty;
      els.placeOrder.setAttribute('aria-disabled', empty ? 'true' : 'false');
    }
  };

  // Visual-only payment selection (toggle styling)
  const initPaymentUi = () => {
    const grid = els.paymentGrid;
    if(!grid) return;

    const buttons = Array.from(grid.querySelectorAll('.checkout-payBtn'));
    if(!buttons.length) return;

    const setSelected = (btn) => {
      buttons.forEach(b => {
        const active = b === btn;
        b.classList.toggle('is-selected', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    };

    buttons.forEach(btn => {
      btn.addEventListener('click', () => setSelected(btn));
      btn.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          setSelected(btn);
        }
      });
    });
  };

  const initCheckoutActions = () => {
    if(!els.placeOrder) return;

   els.placeOrder.addEventListener('click', (e) => {
  e.preventDefault();

  if (els.placeOrder.disabled) return;

  els.placeOrder.disabled = true;

  try{
    const t = computeTotals();

    if(t.itemsCount <= 0){
      if(els.status) els.status.textContent = 'Your cart is empty.';
      els.placeOrder.disabled = false;
      return;
    }

    if(els.status){
      els.status.textContent = 'Order placed (demo). Totals were calculated locally.';
    }

    try{
      window.Toast?.success?.('Order placed successfully');
    }catch{}

    try{
      window.NEXORA?.updateCounts?.();
    }catch{}

  }catch(_e){

    els.placeOrder.disabled = false;

    try{
      window.Toast?.error?.('Checkout failed. Please try again');
    }catch{}
  }
});
  };

  const bindUpdates = () => {
    const onChange = () => {
      try{ render(); }catch(_e){}
    };

    // Cart persistence events fired by cart.js/script.js
    window.addEventListener('cart:updated', onChange);
    window.addEventListener('storage:updated', onChange);
    window.addEventListener('wishlist:updated', onChange);

    // Also respond to native storage changes (qty map)
    window.addEventListener('storage', (e) => {
      if(!e || !e.key) return;
      if(e.key === lsQtyKey || e.key === 'nexora_cart' || e.key === 'nexora_wishlist') onChange();
    });
  };

  initPaymentUi();
  initCheckoutActions();
  bindUpdates();

  // Initial render (double rAF for script.js hydration timing)
  requestAnimationFrame(() => requestAnimationFrame(render));
})();

