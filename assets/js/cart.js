/* =====================================================
   NEXORA — Cart renderer + quantity + totals
   Uses:
   - window.NEXORA.state.cart (array of unique cart IDs)
   - window.NEXORA.state.cartQty (object map id -> qty)
   - localStorage key: nexora_cart_qty_v1
===================================================== */

(function(){
  const root = document.querySelector('.cart-root');
  if(!root) return;

  const lsQtyKey = 'nexora_cart_qty_v1';

  const els = {
    list: root.querySelector('[data-cart-items-list]'),
    empty: root.querySelector('[data-cart-empty]'),
    count: root.querySelector('[data-cart-items-count]'),
    subtotal: root.querySelector('[data-cart-subtotal]'),
    tax: root.querySelector('[data-cart-tax]'),
    total: root.querySelector('[data-cart-total]'),
    delivery: root.querySelector('[data-cart-delivery]'),
    status: root.querySelector('[data-cart-status]'),
    proceed: root.querySelector('[data-proceed-checkout]'),
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

  // Resolver: ensure title/price for homepage featured product ids.
  const resolveProduct = (id) => {
    if(!id || typeof id !== 'string') {
      return { id: String(id || ''), title: 'Unknown item', category: '—', price: 0, img: 'assets/img/bedroom-furniture.jpg', url: '#' };
    }

    // Prefer persisted product display map from cart-api
    try{
      const raw = localStorage.getItem('nexora_cart_products_v1');
      const map = raw ? JSON.parse(raw) : {};
      if(map && typeof map === 'object' && !Array.isArray(map) && map[id]){
        const mp = map[id];
        return { id, title: mp.title || 'Unknown item', category: mp.category || '—', price: Number(mp.price) || 0, img: mp.img || 'assets/img/bedroom-furniture.jpg', url: mp.url || 'product-details.html' };
      }
    }catch(_e){}

    const FEATURED = {
      // Beds
      'sable-platform-bed': { title: 'Sable Platform Bed', category: 'Beds', price: 1899, img: 'assets/img/bedroom-furniture.jpg', url: 'product-details.html' },
      'sable-platform-bed-2': { title: 'Sable Platform Bed', category: 'Beds', price: 1899, img: 'assets/img/bedroom-furniture.jpg', url: 'product-details.html' },
      'noir-upholstered-bed': { title: 'Noir Upholstered Bed', category: 'Beds', price: 2499, img: 'assets/img/bedroom-furniture.jpg', url: 'product-details.html' },

      // Chairs
      'nexo-lounge-chair': { title: 'Nexo Lounge Chair', category: 'Chairs', price: 799, img: 'assets/img/chairs-collection.jpg', url: 'product-details.html' },
      'ember-accent-chair': { title: 'Ember Accent Chair', category: 'Chairs', price: 1099, img: 'assets/img/chairs-collection.jpg', url: 'product-details.html' },

      // Tables
      'atelier-dining-table': { title: 'Atelier Dining Table', category: 'Tables', price: 1299, img: 'assets/img/dining-table.jpg', url: 'product-details.html' },
      'atelier-side-table': { title: 'Atelier Side Table', category: 'Tables', price: 649, img: 'assets/img/dining-table.jpg', url: 'product-details.html' },
      'cedar-coffee-table': { title: 'Cedar Coffee Table', category: 'Tables', price: 899, img: 'assets/img/dining-table.jpg', url: 'product-details.html' },

      // Sofas
      'lumen-modular-sofa': { title: 'Lumen Modular Sofa', category: 'Sofas', price: 3299, img: 'assets/img/Dining-sofa.jpg', url: 'product-details.html' },
      'aria-daybed-sofa': { title: 'Aria Daybed Sofa', category: 'Sofas', price: 2199, img: 'assets/img/Dining-sofa.jpg', url: 'product-details.html' },

      // Decor
      'arc-vase-stone': { title: 'Arc Vase — Stone', category: 'Decor', price: 219, img: 'assets/img/sofa-set.jpg', url: 'product-details.html' },
      'vela-table-lamp': { title: 'Vela Table Lamp', category: 'Decor', price: 349, img: 'assets/img/bedroom-furniture.jpg', url: 'product-details.html' }
    };

    if(Object.prototype.hasOwnProperty.call(FEATURED, id)){
      const p = FEATURED[id];
      return { id, title: p.title, category: p.category, price: p.price, img: p.img, url: p.url };
    }

    // shop-generated ids: category|price|date|title
    const parts = id.split('|');
    if(parts.length >= 4){
      const category = parts[0] || '—';
      const priceNum = parseFloat(String(parts[1] || '0').replace(/[^0-9.]/g,''));
      const title = parts.slice(3).join('|') || 'Unknown item';

      const lower = title.toLowerCase();
      let img = '';
      if(lower.includes('sofa') || category === 'Sofas') img = 'assets/img/sofa-set.jpg';
      else if(category === 'Beds' || lower.includes('bed')) img = 'assets/img/bedroom-furniture.jpg';
      else if(category === 'Chairs' || lower.includes('chair')) img = 'assets/img/chairs-collection.jpg';
      else if(category === 'Tables' || lower.includes('table')) img = 'assets/img/dining-table.jpg';
      else if(category === 'Decor' || lower.includes('lamp') || lower.includes('vase')) img = 'assets/img/bedroom-furniture.jpg';

      return {
        id,
        title,
        category,
        price: Number.isFinite(priceNum) ? priceNum : 0,
        img: img || 'assets/img/bedroom-furniture.jpg',
        url: 'product-details.html'
      };
    }

    // Known PDP product fallback
    if(id === 'pdp-sable-platform-bed' || id === 'sable-platform-bed'){
      return { id, title: 'Sable Platform Bed', category: 'Beds', price: 1899, img: 'assets/img/bedroom-furniture.jpg', url: 'product-details.html' };
    }

    // Numeric ids coming from shop.html / catalog
    const numericId = Number(id);
    if(!Number.isNaN(numericId) && window.PRODUCTS && Array.isArray(window.PRODUCTS)){
      const product = window.PRODUCTS.find(p => Number(p.id) === numericId);
      if(product){
        return { id: product.id, title: product.name, category: product.category, price: product.price, img: product.img, url: 'product-details.html' };
      }
    }

    return { id, title: 'Premium item', category: '—', price: 0, img: 'assets/img/bedroom-furniture.jpg', url: 'product-details.html' };
  };

  const getCartQtyMap = () => {
    try{
      if(window.NEXORA && window.NEXORA.state && window.NEXORA.state.cartQty && typeof window.NEXORA.state.cartQty === 'object'){
        return window.NEXORA.state.cartQty;
      }
    }catch(_e){}

    try{
      const raw = localStorage.getItem(lsQtyKey);
      const parsed = raw ? JSON.parse(raw) : {};
      if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    }catch(_e){}

    return {};
  };

  const setCartQtyMap = (map) => {
    const safe = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
    try{
      if(window.NEXORA && window.NEXORA.state) window.NEXORA.state.cartQty = safe;
    }catch(_e){}

    try{
      if(window.NEXORA && window.NEXORA.storage && window.NEXORA.storage.saveCartQty){
        window.NEXORA.storage.saveCartQty(safe);
      }else{
        localStorage.setItem(lsQtyKey, JSON.stringify(safe));
      }
    }catch(_e){}
  };

  const update = () => {
    const qtyMap = getCartQtyMap();
    const cart = window.NEXORA?.state?.cart;
    const ids = Array.isArray(cart) ? cart.slice() : [];

    if(els.count) {
      els.count.textContent = String(ids.reduce((acc, id) => {
        const q = clampQty(qtyMap[id]);
        return acc + (q > 0 ? q : 1);
      }, 0));
    }

    const isEmpty = !ids.length;
    if(els.empty){
      els.empty.style.display = isEmpty ? '' : 'none';
      els.empty.setAttribute('aria-hidden', isEmpty ? 'false' : 'true');
    }

    if(els.list){
      els.list.innerHTML = '';
      ids.forEach(id => {
        els.list.appendChild(buildCartItemCard(id, qtyMap));
      });
    }

    const t = computeTotals(ids, qtyMap);
    if(els.subtotal) els.subtotal.textContent = money(t.subtotal);
    if(els.tax) els.tax.textContent = money(t.tax);
    if(els.total) els.total.textContent = money(t.total);
    if(els.delivery) els.delivery.textContent = t.deliveryText;

    if(els.status){
      els.status.textContent = isEmpty ? '' : `${t.itemsCount} item${t.itemsCount === 1 ? '' : 's'} in cart.`;
    }

    window.NEXORA?.updateCounts && window.NEXORA.updateCounts();
  };

  const computeTotals = (ids, qtyMap) => {
    if(!Array.isArray(ids) || !ids.length){
      return { itemsCount: 0, subtotal: 0, tax: 0, total: 0, deliveryText: 'Calculated at checkout' };
    }

    let itemsCount = 0;
    let subtotal = 0;

    for(const id of ids){
      const p = resolveProduct(id);
      const qtyRaw = qtyMap && Object.prototype.hasOwnProperty.call(qtyMap, id) ? qtyMap[id] : 1;
      const qty = clampQty(qtyRaw) || 1;
      itemsCount += qty;
      subtotal += (p.price || 0) * qty;
    }

    const tax = subtotal * 0.07;
    const total = subtotal + tax;
    return { itemsCount, subtotal, tax, total, deliveryText: 'Calculated at checkout' };
  };

  const removeItem = (id) => {
    const cart = window.NEXORA?.state?.cart;
    if(Array.isArray(cart)){
      const idx = cart.indexOf(id);
      if(idx >= 0) cart.splice(idx, 1);
    }

    const qtyMap = getCartQtyMap();
    if(qtyMap && Object.prototype.hasOwnProperty.call(qtyMap, id)){
      delete qtyMap[id];
    }
    setCartQtyMap(qtyMap);
    update();
  };

  const updateQty = (id, nextQty) => {
    const q = clampQty(nextQty);
    const cart = window.NEXORA?.state?.cart;
    if(!Array.isArray(cart) || !cart.includes(id)) return;

    if(q <= 0){
      removeItem(id);
      return;
    }

    const qtyMap = getCartQtyMap();
    qtyMap[id] = q;
    setCartQtyMap(qtyMap);
    update();
  };

  const buildCartItemCard = (id, qtyMap) => {
    const p = resolveProduct(id);
    const lineQtyRaw = qtyMap && Object.prototype.hasOwnProperty.call(qtyMap, id) ? qtyMap[id] : 1;
    const qty = clampQty(lineQtyRaw) || 1;
    const subtotal = (p.price || 0) * qty;

    const article = document.createElement('article');
    article.className = 'cart-item';
    article.setAttribute('data-cart-item', id);
    article.setAttribute('data-reveal', 'fade');

    article.innerHTML = `
      <div class="cart-item__media" aria-hidden="true">
        <img src="${p.img || ''}" alt="" loading="lazy" />
      </div>

      <div class="cart-item__body">
        <div class="cart-item__top">
          <div>
            <div class="cart-item__category">${p.category || '—'}</div>
            <h3 class="cart-item__title">${p.title || 'Unknown item'}</h3>
            <div class="cart-item__unitPrice" aria-label="Unit price">${money(p.price || 0)}</div>
          </div>

          <button class="cart-item__remove" type="button" aria-label="Remove item" data-cart-remove>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path d="M18 6L6 18"/>
              <path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="cart-item__bottom">
          <div class="cart-qty" aria-label="Quantity controls">
            <button class="cart-qty__btn" type="button" aria-label="Decrease quantity" data-qty-minus>−</button>
            <input class="cart-qty__input" type="number" inputmode="numeric" min="1" max="99" step="1" value="${qty}" aria-label="Quantity" data-qty-input />
            <button class="cart-qty__btn" type="button" aria-label="Increase quantity" data-qty-plus>+</button>
          </div>

          <div class="cart-item__lineTotal" aria-label="Line total">
            <span class="cart-item__lineTotalLabel">Total</span>
            <span class="cart-item__lineTotalValue" data-cart-line-total>${money(subtotal)}</span>
          </div>
        </div>
      </div>

      <a class="cart-item__link" href="${p.url || '#'}" aria-label="View product" tabindex="-1" data-cart-item-link></a>
    `;

    article.querySelector('[data-cart-remove]')?.addEventListener('click', () => removeItem(id));

    const minus = article.querySelector('[data-qty-minus]');
    const plus = article.querySelector('[data-qty-plus]');
    const input = article.querySelector('[data-qty-input]');

    minus?.addEventListener('click', () => {
      const current = Number(input?.value || qty);
      updateQty(id, current - 1);
    });

    plus?.addEventListener('click', () => {
      const current = Number(input?.value || qty);
      updateQty(id, current + 1);
    });

    input?.addEventListener('change', () => {
      const current = Number(input?.value || qty);
      updateQty(id, current);
    });

    if(window.NEXORA?.reveal?.observe){
      window.NEXORA.reveal.observe(article);
    } else {
      article.classList.add('reveal-in'); // reveal system not ready yet — fail safe, never leave content invisible
    }

    return article;
  };

  const initCheckout = () => {
    els.proceed?.addEventListener('click', () => {
      if(!window.NEXORA?.state?.cart?.length){
        els.proceed.disabled = true;
        window.location.href = 'shop.html';
        return;
      }
      window.location.href = 'checkout.html';
    });
  };

  window.addEventListener('cart:updated', () => update());
  window.addEventListener('storage:updated', () => update());
  window.addEventListener('wishlist:updated', () => update());

  initCheckout();
  requestAnimationFrame(() => requestAnimationFrame(update));
})();

