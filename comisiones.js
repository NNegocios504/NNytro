const commissionGroups = [
  { id: 'portadas', title: 'Portada', intro: 'Diseño visual para tu música o proyecto.', items: [
    { id: 'portada-normal', name: 'Diseño y edición · portada normal', price: 5, example: '4Real portada', src: './assets/gallery/portadas/portadas/4Real portada/4Real Final.webp', note: 'Collage y diseño de portada' },
    { id: 'portada-dibujo', name: 'Dibujo + edición · portada', price: 10, example: 'BrokenCodes · dibujo de portada', src: './assets/gallery/portadas/portadas/brokencodes Dibujo portada.webp', note: 'Ilustración integrada a una portada' }
  ]},
  { id: 'miniaturas', title: 'Miniaturas', intro: 'Diseño para videos, canales y publicaciones.', items: [
    { id: 'miniatura-normal', name: 'Miniatura normal', price: 5 },
    { id: 'miniatura-render', name: 'Miniatura + render', price: 15, example: '__Sunn · Séptimo Refugio', src: './assets/gallery/miniaturas/miniaturas/miniatura-matt-7ref-recuperado.png' },
    { id: 'miniatura-dibujo', name: 'Miniatura + dibujo', price: 25, related: 'Ejemplo relacionado; no es una miniatura publicada', example: 'Ruby7TY · dibujo final', src: './assets/gallery/dibujos/dibujos/Ruby7TY Dibujo, Portada/final.webp' }
  ]},
  { id: 'edicion-video', title: 'Edición de video', intro: 'Montaje, ritmo y tratamiento visual según tu proyecto.', items: [
    { id: 'visualizers', name: 'Visualizers', price: 10 }, { id: 'videoclip', name: 'Videoclip', price: 15 }, { id: 'video-normal', name: 'Video normal', price: 25 }, { id: 'video-vertical', name: 'Video vertical corto', price: 15 }
  ]},
  { id: 'edicion-imagen', title: 'Edición de imagen', intro: 'Una imagen intervenida para llevarla a la idea que tenés.', items: [
    { id: 'edicion-imagen', name: 'Edición', price: 5, example: '444 · edición experimental', src: './assets/gallery/portadas/portadas/444.webp', note: 'Edición experimental de una foto' }
  ]},
  { id: 'renders', title: 'Renders', intro: 'Escenas 3D para tu personaje, mundo u objeto.', items: [
    { id: 'render-skin', name: 'Render de skin Minecraft', price: 10, example: 'Didy · render de skin Minecraft', src: './assets/gallery/matt/matt/didy-render.png', note: 'Render de skin de Minecraft' },
    { id: 'render-general', name: 'Render de cualquier cosa', price: 10, example: 'UnderNews Anuncios', src: './assets/gallery/renders/renders/UnderNews Anuncios.webp' }
  ]},
  { id: 'animacion-blender', title: 'Animación en Blender', intro: 'Movimiento y escenas 3D pensados para tu proyecto.', items: [
    { id: 'animacion-blender', name: 'Animación', price: 25, related: 'Ejemplo relacionado: proyecto con animación 3D', example: 'Séptimo Refugio · proyecto 3D', src: './assets/gallery/dibujos/dibujos/Render Anuncio 7Refugio/Boceto final.webp' }
  ]},
  { id: 'blockbench', title: 'Blockbench Minecraft', intro: 'Modelos, skins, criaturas y recursos para Minecraft.', items: [
    { id: 'skin-minecraft', name: 'Skins Minecraft', price: 5, example: 'Shiden, Wasabi y NNytro · skins', src: './assets/gallery/skins/skins/Shiden, Wasabi, NNytro Skins.webp', note: 'Skins diseñadas en Blockbench' },
    { id: 'objetos-bloques', name: 'Objetos o bloques', price: 10, examples: [
      { name: 'Diarios · Gravity Core', src: './assets/gallery/modeloss blockbench/modeloss blockbench/Diarios Gravity Core.webp' },
      { name: 'Borramentes · Gravity Core', src: './assets/gallery/modeloss blockbench/modeloss blockbench/Gravity Core Borramentes objeto.png' }
    ], note: 'Objetos modelados para Gravity Core' },
    { id: 'texturas', name: 'Texturas', price: 5, related: 'Ejemplo relacionado: texturas UV de un modelo', example: 'Gnomos · Gravity Core', src: './assets/gallery/modeloss blockbench/modeloss blockbench/Gnomos Gravity Core.webp' },
    { id: 'mob-sin-animacion', name: 'Mobs (sin animaciones)', price: 20, examples: [
      { name: 'Cobblewonker · Gravity Core', src: './assets/gallery/modeloss blockbench/modeloss blockbench/Gravity Core Cobblewonker sin animacion.png' }
    ] },
    { id: 'mob-con-animacion', name: 'Mobs (con animaciones)', price: 25, examples: [
      { name: 'Gnomo en ataque · Gravity Core', src: './assets/gallery/modeloss blockbench/modeloss blockbench/Gnomo ataque Gravity Core.webp' },
      { name: 'Gnomo animado · Gravity Core', src: './assets/gallery/modeloss blockbench/modeloss blockbench/Gravity Core Gnomo animado.png' }
    ] }
  ]},
  { id: 'texture-pack', title: 'Texture pack custom', intro: 'Recursos visuales para personalizar tu experiencia.', items: [
    { id: 'texture-basico', name: 'Texture pack básico', price: 20 }, { id: 'texture-completo', name: 'Texture pack completo', price: 35 },
    { id: 'texture-ui', name: 'Solo diseño de UIs', price: 15, example: 'Gravity Core · menú azul', src: './assets/gallery/menus/menus/GravityCore menu azul.webp', note: 'Menú y diseño de interfaz' }
  ]},
  { id: 'dibujos', title: 'Dibujos', intro: 'Desde un primer boceto hasta una ilustración terminada.', items: [
    { id: 'boceto-basico', name: 'Bocetos básicos', price: 10, example: 'Lordkai OC', src: './assets/gallery/dibujos/dibujos/Lordkai OC.webp' },
    { id: 'dibujo-color', name: 'Dibujo con coloreado básico', price: 25, example: 'Ruby7TY · dibujo a color', src: './assets/gallery/dibujos/dibujos/Ruby7TY Dibujo, Portada/medio.webp' },
    { id: 'dibujo-completo', name: 'Dibujo completo', price: 35, example: 'Nyxza dibujo OC', src: './assets/gallery/dibujos/dibujos/Nyxza dibujo OC.webp' },
    { id: 'concept-art', name: 'Concept arts', price: 30, example: 'Tryer OC', src: './assets/gallery/dibujos/dibujos/Tryer OC.webp' }
  ]}
];

const cartKey = 'nnytro-commission-cart-v1';
const ordersKey = 'nnytro-commission-orders-demo-v1';
const profileKey = 'nnytro-customer-profile-demo-v1';
const liveApiMode = (location.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) || (location.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '8788');
const cart = loadCart();
const catalogRoot = document.querySelector('#commission-catalog-groups');
const jumpRoot = document.querySelector('#commission-jump-links');
const cartRoot = document.querySelector('#commission-cart');
const cartCount = document.querySelector('#commission-cart-count');
const cartReopen = document.querySelector('#commission-cart-reopen');
const cartReopenCount = document.querySelector('#commission-cart-reopen-count');
const cartItems = document.querySelector('#commission-cart-items');
const cartEstimate = document.querySelector('#commission-cart-estimate');
const cartEmpty = document.querySelector('#commission-cart-empty');
const cartTotal = document.querySelector('.cart-total');
const cartToggle = document.querySelector('.commission-cart-summary');
const cartDetails = document.querySelector('#commission-cart-details');
const sendOrder = document.querySelector('#commission-send-order');
const commissionLiveStatus = document.querySelector('#commission-live-status');
let commissionsOpen = true;
let commissionStatusReady = false;
const clearCart = document.querySelector('#commission-clear-cart');
const orderDialog = document.querySelector('#commission-order-dialog');
const orderContent = document.querySelector('#commission-order-content');
const orderLoginGate = document.querySelector('#commission-login-gate');
const orderLoginStatus = document.querySelector('#commission-login-status');
const orderLoginBack = document.querySelector('#commission-login-back');
const orderAuthLinks = [...document.querySelectorAll('[data-order-auth-provider]')];
const orderLoginReturnKey = 'nnytro-order-login-return';
const commissionImageDialog = document.querySelector('#commission-image-dialog');
const commissionImageOriginal = document.querySelector('#commission-image-original');
const commissionImagePrevious = commissionImageDialog?.querySelector('.commission-image-nav--previous');
const commissionImageNext = commissionImageDialog?.querySelector('.commission-image-nav--next');
let commissionImageSet = [];
let commissionImageIndex = 0;
let commissionImageZoom = 1;
let commissionImageOffset = { x:0, y:0 };
let commissionImageDrag = null;
const commissionHeroImageButton = document.querySelector('.commission-hero-image-open');
const orderPreview = document.querySelector('#commission-order-preview');
const copyStatus = document.querySelector('#commission-copy-status');
const submitRequest = document.querySelector('#commission-submit-request');
const clientContact = document.querySelector('#commission-client-contact');
const clientDetails = document.querySelector('#commission-client-details');
const dialogFootnote = document.querySelector('#commission-dialog-footnote');
const orderIntro = document.querySelector('#commission-dialog-intro');
const requestSuccess = document.querySelector('#commission-request-success');
const t = value => window.NNytroI18n?.t(value) || value;

function renderMailModeCopy() {
  dialogFootnote.textContent=t(liveApiMode?'El pedido se guarda para que NNytro lo revise. No inicia ningún pago.':'Esta demo guarda el pedido solo en este navegador; no envía correos automáticamente.');
}

function loadCart() {
  try {
    const value = JSON.parse(localStorage.getItem(cartKey) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
function loadOrders() {
  try {
    const value = JSON.parse(localStorage.getItem(ordersKey) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function saveOrders(orders) {
  try { localStorage.setItem(ordersKey, JSON.stringify(orders)); } catch { /* Keep local preview usable if storage is disabled. */ }
}
function saveCart() {
  try { localStorage.setItem(cartKey, JSON.stringify(cart)); } catch { /* The current tab still works if storage is disabled. */ }
  document.dispatchEvent(new Event('nnytro:cart-change'));
}
const allServices = [...commissionGroups.flatMap(group => group.items.map(item => ({ ...item, group: group.title }))), { id: 'saludo', name: 'Un saludo mío', price: 0.01, group: 'Bonus' }];
const formatUsd = value => Number(value).toLocaleString(({ 'pt-BR':'pt-BR', en:'en-US', es:'es-AR' })[window.NNytroI18n?.getLanguage?.() || 'es'], { minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2, maximumFractionDigits: 2 });
const currencyCacheKey = 'nnytro-usd-rates-v1';
let displayCurrency = window.NNytroCurrency?.getCurrency?.() || (() => { try { return localStorage.getItem('nnytro-currency') || 'USD'; } catch { return 'USD'; } })();
let exchangeRates = { USD:1 };
let exchangeRateDate = '';
let exchangeRateDates = {};
const currencyLocale = () => { const language = (window.NNytroI18n?.getLanguage?.() || 'es').toLowerCase(); return language.startsWith('pt') ? 'pt-BR' : language.startsWith('en') ? 'en-US' : 'es-AR'; };
function formatLocalPrice(value) {
  const rate = exchangeRates[displayCurrency];
  if (!rate) return `USD ${formatUsd(value)}`;
  try {
    const usd = displayCurrency === 'USD';
    const amount = usd ? Number(value) : Math.round(Number(value) * rate);
    if (!usd && amount >= 1000) return `${displayCurrency} ${Math.floor(amount / 1000)}k`;
    return new Intl.NumberFormat(currencyLocale(), { style:'currency', currency:displayCurrency, currencyDisplay:'code', minimumFractionDigits:usd && !Number.isInteger(amount) ? 2 : 0, maximumFractionDigits:usd ? 2 : 0 }).format(amount);
  }
  catch { return `USD ${formatUsd(value)}`; }
}
function formatCartEstimate(usdTotal, greetingQuantity) {
  const rate = exchangeRates[displayCurrency];
  if (!rate || displayCurrency === 'USD' || greetingQuantity < 1) return formatLocalPrice(usdTotal);
  const otherServicesLocal = Math.round(Math.max(0, Number(usdTotal) - greetingQuantity * .01) * rate);
  const amount = otherServicesLocal + greetingQuantity * .01;
  if (amount >= 1000) return `${displayCurrency} ${Math.floor(amount / 1000)}k`;
  try {
    return new Intl.NumberFormat(currencyLocale(), { style:'currency', currency:displayCurrency, currencyDisplay:'code', minimumFractionDigits:2, maximumFractionDigits:2 }).format(amount);
  } catch { return `USD ${formatUsd(usdTotal)}`; }
}
function updateDisplayedPrices() {
  document.querySelectorAll('.commission-service-card').forEach(card => {
    const amount = card.querySelector('.commission-price strong');
    if (amount) amount.textContent = formatLocalPrice(Number(card.dataset.priceUsd));
  });
  const greetingPrice = document.querySelector('.greeting-price');
  if (greetingPrice) greetingPrice.textContent = '0,01';
  renderCart();
  updateCurrencyRateNote();
}
function updateCurrencyRateNote() {
  const note = document.querySelector('#commission-currency-rate-note');
  if (!note) return;
  const language = (window.NNytroI18n?.getLanguage?.() || 'es').toLowerCase();
  const lang = language.startsWith('pt') ? 'pt' : language.startsWith('en') ? 'en' : 'es';
  const date = exchangeRateDates[displayCurrency] || exchangeRateDate;
  const copy = {
    es: displayCurrency === 'USD' ? 'El pedido y el precio final se confirman en USD.' : exchangeRates[displayCurrency] ? `Cambio de referencia${date ? ` · ${date}` : ''}. El pedido y el precio final se confirman en USD.` : `No hay cotización disponible para ${displayCurrency}; se muestran USD.`,
    en: displayCurrency === 'USD' ? 'Orders and final quotes are confirmed in USD.' : exchangeRates[displayCurrency] ? `Reference rate${date ? ` · ${date}` : ''}. Orders and final quotes are confirmed in USD.` : `No rate is available for ${displayCurrency}; prices are shown in USD.`,
    pt: displayCurrency === 'USD' ? 'O pedido e o preço final são confirmados em USD.' : exchangeRates[displayCurrency] ? `Cotação de referência${date ? ` · ${date}` : ''}. O pedido e o preço final são confirmados em USD.` : `Não há cotação disponível para ${displayCurrency}; os preços são exibidos em USD.`
  };
  note.textContent = copy[lang] || copy.es;
}
async function loadCurrencyRates() {
  try {
    const cached = JSON.parse(localStorage.getItem(currencyCacheKey) || 'null');
    if (cached?.rates && cached?.date && Date.now() - Number(cached.savedAt || 0) < 7 * 24 * 60 * 60 * 1000) { exchangeRates = { USD:1, ...cached.rates }; exchangeRateDates = cached.dates || {}; exchangeRateDate = cached.date; updateDisplayedPrices(); }
  } catch { /* A fresh rate can still be requested if storage is unavailable. */ }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const response = await fetch('https://api.frankfurter.dev/v2/rates?base=USD', { cache:'no-store', signal:controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error('Exchange rates are unavailable');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Unexpected exchange rate data');
    const rates = {};
    const dates = {};
    data.forEach(row => { if (row.base === 'USD' && row.quote && Number.isFinite(Number(row.rate))) { rates[row.quote] = Number(row.rate); dates[row.quote] = row.date || ''; } });
    exchangeRates = { USD:1, ...rates };
    exchangeRateDates = dates;
    exchangeRateDate = data[0]?.date || '';
    try { localStorage.setItem(currencyCacheKey, JSON.stringify({ rates, dates, date:exchangeRateDate, savedAt:Date.now() })); } catch { /* Rates remain available for this page. */ }
    updateDisplayedPrices();
  } catch {
    updateDisplayedPrices();
  }
}

function renderCatalog() {
  jumpRoot.replaceChildren();
  catalogRoot.replaceChildren();
  commissionGroups.forEach(group => {
    const jump = document.createElement('a');
    jump.href = `#categoria-${group.id}`;
    jump.textContent = t(group.title);
    jumpRoot.append(jump);
    const section = document.createElement('section');
    section.className = 'commission-category';
    section.id = `categoria-${group.id}`;
    section.setAttribute('aria-labelledby', `titulo-${group.id}`);
    const heading = document.createElement('div');
    heading.className = 'commission-category-heading';
    const title = document.createElement('h3'); title.id = `titulo-${group.id}`; title.textContent = t(group.title);
    const intro = document.createElement('p'); intro.textContent = t(group.intro);
    heading.append(title, intro);
    const grid = document.createElement('div'); grid.className = 'commission-service-grid';
    group.items.forEach(item => grid.append(makeServiceCard({ ...item, group: group.title })));
    section.append(heading, grid); catalogRoot.append(section);
  });
}

function openCommissionImage(src, alt, images = []) {
  if (!src || !commissionImageDialog || !commissionImageOriginal) return;
  commissionImageSet = images;
  commissionImageIndex = Math.max(0, images.findIndex(image => (image.currentSrc || image.src) === src));
  const image = commissionImageSet[commissionImageIndex];
  resetCommissionImageView();
  commissionImageOriginal.src = image ? image.currentSrc || image.src : src;
  commissionImageOriginal.alt = image?.alt || alt || t('Imagen original de ejemplos de comisión');
  const canNavigate = commissionImageSet.length > 1;
  if (commissionImagePrevious) commissionImagePrevious.hidden = !canNavigate;
  if (commissionImageNext) commissionImageNext.hidden = !canNavigate;
  if (typeof commissionImageDialog.showModal === 'function') commissionImageDialog.showModal();
  else commissionImageDialog.setAttribute('open', '');
}

function moveCommissionImage(direction) {
  if (commissionImageSet.length < 2) return;
  commissionImageIndex = (commissionImageIndex + direction + commissionImageSet.length) % commissionImageSet.length;
  const image = commissionImageSet[commissionImageIndex];
  resetCommissionImageView();
  commissionImageOriginal.src = image.currentSrc || image.src;
  commissionImageOriginal.alt = image.alt || t('Imagen original de ejemplos de comisión');
}

function resetCommissionImageView(){commissionImageZoom=1;commissionImageOffset={x:0,y:0};if(commissionImageOriginal){commissionImageOriginal.style.transform='';commissionImageOriginal.style.cursor='zoom-in'}}
function setCommissionImageZoom(value){commissionImageZoom=Math.min(5,Math.max(1,value));if(commissionImageZoom===1)commissionImageOffset={x:0,y:0};const image=commissionImageOriginal;const maxX=image?image.clientWidth*(commissionImageZoom-1)/2:0;const maxY=image?image.clientHeight*(commissionImageZoom-1)/2:0;commissionImageOffset.x=Math.min(maxX,Math.max(-maxX,commissionImageOffset.x));commissionImageOffset.y=Math.min(maxY,Math.max(-maxY,commissionImageOffset.y));if(image){image.style.transform=`translate(${commissionImageOffset.x}px,${commissionImageOffset.y}px) scale(${commissionImageZoom})`;image.style.cursor=commissionImageZoom>1?'grab':'zoom-in'}}

function makeServiceCard(item) {
  const card = document.createElement('article'); card.className = 'commission-service-card'; card.dataset.serviceId = item.id;
  card.dataset.priceUsd = String(item.price);
  const examples = item.examples || (item.src ? [{ name: item.example, src: item.src }] : []);
  const visual = document.createElement('div'); visual.className = examples.length ? 'commission-service-visual' : 'commission-service-visual commission-service-visual--empty';
  const makeExample = exampleData => {
    const example = document.createElement('div'); example.className = 'commission-service-example';
    const image = document.createElement('img'); image.src = exampleData.src; image.alt = exampleData.name ? `${t('Ejemplo del portfolio:')} ${t(exampleData.name)}` : ''; image.loading = 'lazy'; image.decoding = 'async';
    image.onerror = () => { example.remove(); if (!visual.querySelector('.commission-service-example')) { visual.classList.add('commission-service-visual--empty'); visual.textContent = t('MUESTRA EN PORTFOLIO'); } };
    const openImage = document.createElement('button'); openImage.type = 'button'; openImage.className = 'commission-example-open'; openImage.setAttribute('aria-label', `${t('Abrir imagen de ejemplo:')} ${t(exampleData.name || item.name)}`); openImage.append(image);
    openImage.addEventListener('click', () => openCommissionImage(image.currentSrc || image.src, image.alt, examples.map(example => ({ src: new URL(example.src, document.baseURI).href, alt: example.name ? `${t('Ejemplo del portfolio:')} ${t(example.name)}` : '' }))));
    const caption = document.createElement('span'); caption.className = 'commission-example-name'; caption.textContent = t(exampleData.name || ''); example.append(caption, openImage);
    return example;
  };
  if (examples.length) {
    if (examples.length > 1) {
      visual.classList.add('commission-service-visual--multiple');
      visual.setAttribute('role', 'region'); visual.setAttribute('aria-roledescription', t('carrusel')); visual.setAttribute('aria-label', t('Ejemplos del servicio'));
      visual.tabIndex = 0;
      let currentIndex = 0;
      const slide = document.createElement('div'); slide.className = 'commission-service-example-slot';
      const status = document.createElement('span'); status.className = 'commission-example-count'; status.setAttribute('aria-live', 'polite');
      const renderSlide = () => { slide.replaceChildren(makeExample(examples[currentIndex])); status.textContent = `${currentIndex + 1} / ${examples.length}`; };
      const move = direction => { currentIndex = (currentIndex + direction + examples.length) % examples.length; renderSlide(); };
      const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'commission-example-nav commission-example-nav--previous'; previous.textContent = '‹'; previous.setAttribute('aria-label', t('Imagen anterior'));
      const next = document.createElement('button'); next.type = 'button'; next.className = 'commission-example-nav commission-example-nav--next'; next.textContent = '›'; next.setAttribute('aria-label', t('Imagen siguiente'));
      previous.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
      visual.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
      });
      renderSlide(); visual.append(slide, previous, next, status);
    } else visual.append(makeExample(examples[0]));
  } else { visual.textContent = t('EJEMPLO PRÓXIMAMENTE'); }
  const body = document.createElement('div'); body.className = 'commission-service-copy';
  const title = document.createElement('h4'); title.textContent = t(item.name);
  const price = document.createElement('p'); price.className = 'commission-price'; price.innerHTML = `<span>PRECIO</span><strong>${formatLocalPrice(item.price)}</strong>`;
  body.append(title, price);
  if (item.related || item.note) { const note = document.createElement('p'); note.className = 'commission-example-note'; note.textContent = t(item.related || item.note); body.append(note); }
  const button = document.createElement('button'); button.type = 'button'; button.className = 'commission-add-button'; button.dataset.addService = item.id; button.setAttribute('aria-label', `${t('Agregar')} ${t(item.name)} ${t('al pedido')}`); button.innerHTML = `<span>${t('Agregar al pedido')}</span><b aria-hidden="true">＋</b>`;
  card.append(visual, body, button); return card;
}

function getCartCount() { return Object.values(cart).reduce((total, quantity) => total + Math.max(0, Number(quantity) || 0), 0); }
function setCartOpen(open, restoreFocus = false) {
  document.body.dataset.cartOpen = String(open);
  cartRoot.dataset.open = String(open);
  cartToggle.setAttribute('aria-expanded', String(open));
  cartReopen.setAttribute('aria-expanded', String(open));
  cartReopen.hidden = open;
  cartRoot.setAttribute('aria-hidden', String(!open));
  cartRoot.inert = !open;
  cartReopen.setAttribute('aria-label', `${t('Abrir carrito,')} ${getCartCount()} ${t(getCartCount() === 1 ? 'opción' : 'opciones')}`);
  if (restoreFocus) (open ? cartToggle : cartReopen).focus();
}
function renderCart() {
  const count = getCartCount(); let estimateTotal = 0; cartRoot.dataset.empty = count === 0 ? 'true' : 'false'; cartCount.textContent = String(count); cartReopenCount.textContent = String(count); cartItems.replaceChildren();
  allServices.forEach(item => {
    const quantity = Math.max(0, Math.floor(Number(cart[item.id]) || 0));
    estimateTotal += item.price * quantity;
    document.querySelectorAll(`[data-service-id="${CSS.escape(item.id)}"]`).forEach(card => {
      card.classList.toggle('is-added', quantity > 0); const button = card.querySelector('[data-add-service]');
      if (button) { button.innerHTML = quantity ? `<span>${t('En el pedido')} <b class="service-quantity">× ${quantity}</b></span><b aria-hidden="true">＋</b>` : `<span>${t('Agregar al pedido')}</span><b aria-hidden="true">＋</b>`; button.setAttribute('aria-label', quantity ? `${t(item.name)}, ${t('cantidad')} ${quantity}. ${t('Agregar uno más')}` : `${t('Agregar')} ${t(item.name)} ${t('al pedido')}`); }
    });
    if (!quantity) return;
    const row = document.createElement('div'); row.className = 'commission-cart-item'; const description = document.createElement('span'); description.textContent = `${t(item.name)} × ${quantity}`;
    const estimate = document.createElement('small'); estimate.textContent = item.id === 'saludo' ? '0,01' : formatLocalPrice(item.price * quantity); description.append(document.createElement('br'), estimate);
    const remove = document.createElement('button'); remove.type = 'button'; remove.dataset.removeService = item.id; remove.setAttribute('aria-label', `${t('Quitar')} ${t(item.name)} ${t('del pedido')}`); remove.textContent = '−'; row.append(description, remove); cartItems.append(row);
  });
  const greetingButton = document.querySelector('.greeting-add-button');
  if (greetingButton) {
    const quantity = Math.max(0, Math.floor(Number(cart.saludo) || 0));
    greetingButton.innerHTML = quantity ? `<span>${t('En el pedido')} <b class="service-quantity">× ${quantity}</b></span><b aria-hidden="true">＋</b>` : `<span>${t('Agregar al pedido')}</span><b aria-hidden="true">＋</b>`;
    greetingButton.setAttribute('aria-label', quantity ? `${t('Un saludo mío')}, ${t('cantidad')} ${quantity}. ${t('Agregar uno más')}` : t('Agregar un saludo mío al pedido'));
  }
  const greetingQuantity = Math.max(0, Math.floor(Number(cart.saludo) || 0));
  cartEstimate.textContent = formatCartEstimate(estimateTotal, greetingQuantity);
  cartTotal.hidden = count === 0;
  cartEmpty.hidden = count !== 0;
  sendOrder.disabled = count === 0 || !commissionStatusReady || !commissionsOpen; clearCart.hidden = count === 0; cartToggle.setAttribute('aria-label', `${t('Tu pedido')}: ${count} ${t(count === 1 ? 'opción' : 'opciones')}`); cartReopen.setAttribute('aria-label', `${t('Abrir carrito,')} ${count} ${t(count === 1 ? 'opción' : 'opciones')}`);
}
async function loadCommissionStatus(){try{const response=await fetch('/api/commissions/status',{credentials:'same-origin',cache:'no-store'});const body=await response.json();if(!response.ok)throw new Error(body.error||'No se pudo consultar el estado.');commissionsOpen=body.open===true;commissionStatusReady=true;commissionLiveStatus.dataset.open=String(commissionsOpen);commissionLiveStatus.lastChild.textContent=commissionsOpen?' Estado: comisiones abiertas':' Estado: comisiones cerradas'}catch{commissionStatusReady=false;commissionLiveStatus.dataset.open='unknown';commissionLiveStatus.lastChild.textContent=' Estado: no disponible'}renderCart()}
function orderText() {
  const chosen = allServices.filter(item => Number(cart[item.id]) > 0);
  const profile = (() => { try { return JSON.parse(localStorage.getItem(profileKey) || '{}'); } catch { return {}; } })();
  return [t('Hola NNytro, quería consultar por este pedido:'), ...chosen.map(item => `• ${t(item.name)} × ${Number(cart[item.id])} (${t('Precio publicado USD')} ${formatUsd(item.price * Number(cart[item.id]))})`), '', `${t('Nombre elegido:')} ${String(profile.name || '').trim() || t('(sin guardar)')}`, `${t('Mi contacto:')} ${clientContact.value.trim() || t('(agregar Discord o email)')}`, `${t('Detalles:')} ${clientDetails.value.trim() || t('(contar la idea)')}`, '', t('Te cuento la idea y confirmamos si el precio publicado aplica a mi pedido. Todavía no confirmé ninguna compra.')].join('\n');
}
async function openOrderDialog() {
  if(!commissionStatusReady||!commissionsOpen){copyStatus.textContent=commissionStatusReady?'Las comisiones están cerradas por el momento.':'No se pudo consultar si las comisiones están abiertas. Probá de nuevo más tarde.';return}
  clientContact.value = ''; clientDetails.value = '';
  orderPreview.hidden=false;clientContact.closest('label').hidden=false;clientDetails.closest('label').hidden=false;orderIntro.hidden=false;submitRequest.hidden=false;dialogFootnote.hidden=false;copyStatus.hidden=false;requestSuccess.hidden=true;
  const summary = document.createElement('pre'); summary.textContent = orderText(); orderPreview.replaceChildren(summary); copyStatus.textContent = '';
  submitRequest.disabled = false;
  clientContact.addEventListener('input', scheduleRefreshOrderText); clientDetails.addEventListener('input', scheduleRefreshOrderText);
  if (typeof orderDialog.showModal === 'function') orderDialog.showModal(); else orderDialog.setAttribute('open', '');
  setOrderLoginGate(liveApiMode);
  if(liveApiMode){try{const response=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});const auth=response.ok?await response.json():{user:null};if(!auth.user)return;setOrderLoginGate(false)}catch{copyStatus.textContent='No pude revisar tu sesión. Probá de nuevo en unos segundos.';return}}
}
function setOrderLoginGate(open){if(!orderLoginGate)return;orderLoginGate.hidden=!open;orderContent?.classList.toggle('is-blurred',open);orderContent?.toggleAttribute('inert',open);if(open){orderLoginBack?.focus();void loadOrderAuthProviders()}else clientContact?.focus()}
let orderAuthProvidersRequest;
function loadOrderAuthProviders(){if(orderAuthProvidersRequest)return orderAuthProvidersRequest;const names={google:'Google',discord:'Discord',x:'Twitter'};orderAuthProvidersRequest=fetch('/api/auth/providers',{credentials:'same-origin',cache:'no-store'}).then(response=>{if(!response.ok)throw Error('provider status unavailable');return response.json()}).then(available=>{for(const link of orderAuthLinks){const provider=link.dataset.orderAuthProvider,enabled=Boolean(available[provider]);link.setAttribute('aria-disabled',String(!enabled));link.tabIndex=enabled?0:-1;link.querySelector('[data-order-auth-label]').textContent=enabled?`${t('Iniciar con')} ${names[provider]}`:`${names[provider]} · ${t('no configurado')}`}orderLoginStatus.textContent=t('Elegí una cuenta para continuar. Tu pedido te espera al volver.')}).catch(()=>{orderAuthProvidersRequest=null;for(const link of orderAuthLinks){link.setAttribute('aria-disabled','true');link.tabIndex=-1;link.querySelector('[data-order-auth-label]').textContent=`${names[link.dataset.orderAuthProvider]} · ${t('no disponible')}`}orderLoginStatus.textContent=t('No se pudo contactar al servidor de acceso. Probá de nuevo en unos segundos.')});return orderAuthProvidersRequest}
let orderTextRefreshTimer;
function scheduleRefreshOrderText(){clearTimeout(orderTextRefreshTimer);orderTextRefreshTimer=setTimeout(refreshOrderText,180)}
function refreshOrderText() {
  if(orderPreview.hidden)return;
  const summary = document.createElement('pre'); summary.textContent = orderText(); orderPreview.replaceChildren(summary);
}

function showRequestSuccess() {
  orderIntro.hidden=true;orderPreview.hidden=true;clientContact.closest('label').hidden=true;clientDetails.closest('label').hidden=true;submitRequest.hidden=true;dialogFootnote.hidden=true;copyStatus.hidden=true;requestSuccess.hidden=false;
  requestSuccess.focus();
}

renderCatalog(); renderCart(); updateDisplayedPrices(); setCartOpen(false); loadCurrencyRates(); const commissionStatusPromise=loadCommissionStatus();
if(new URLSearchParams(location.search).get('resumeOrder')==='1'){const params=new URLSearchParams(location.search);params.delete('resumeOrder');history.replaceState(null,'',`${location.pathname}${params.size?'?'+params.toString():''}${location.hash}`);setCartOpen(true);commissionStatusPromise.then(()=>openOrderDialog())}
commissionHeroImageButton?.addEventListener('click', () => {
  const image = commissionHeroImageButton.querySelector('img');
  if (!image) return;
  openCommissionImage(image.currentSrc || image.src, image.alt);
});
commissionImageDialog?.addEventListener('click', event => { if (event.target === commissionImageDialog) commissionImageDialog.close(); });
commissionImagePrevious?.addEventListener('click', () => moveCommissionImage(-1));
commissionImageNext?.addEventListener('click', () => moveCommissionImage(1));
commissionImageDialog?.addEventListener('keydown', event => {
  if ((event.key==='+'||event.key==='=')&&!event.ctrlKey){event.preventDefault();setCommissionImageZoom(commissionImageZoom+.5);return}
  if ((event.key==='-'||event.key==='_')&&!event.ctrlKey){event.preventDefault();setCommissionImageZoom(commissionImageZoom-.5);return}
  if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') || commissionImageSet.length < 2) return;
  event.preventDefault();
  moveCommissionImage(event.key === 'ArrowRight' ? 1 : -1);
});
commissionImageOriginal?.addEventListener('wheel',event=>{event.preventDefault();setCommissionImageZoom(commissionImageZoom+(event.deltaY<0?.25:-.25))},{passive:false});
commissionImageOriginal?.addEventListener('dblclick',event=>{event.preventDefault();setCommissionImageZoom(commissionImageZoom===1?2:1)});
commissionImageOriginal?.addEventListener('pointerdown',event=>{if(commissionImageZoom<=1)return;event.preventDefault();commissionImageDrag={id:event.pointerId,x:event.clientX,y:event.clientY,offsetX:commissionImageOffset.x,offsetY:commissionImageOffset.y};commissionImageOriginal.setPointerCapture(event.pointerId);commissionImageOriginal.style.cursor='grabbing'});
commissionImageOriginal?.addEventListener('pointermove',event=>{if(!commissionImageDrag||commissionImageDrag.id!==event.pointerId)return;commissionImageOffset.x=commissionImageDrag.offsetX+event.clientX-commissionImageDrag.x;commissionImageOffset.y=commissionImageDrag.offsetY+event.clientY-commissionImageDrag.y;setCommissionImageZoom(commissionImageZoom)});
const finishCommissionImageDrag=event=>{if(commissionImageDrag?.id===event.pointerId)commissionImageDrag=null;if(commissionImageOriginal)commissionImageOriginal.style.cursor=commissionImageZoom>1?'grab':'zoom-in'};
commissionImageOriginal?.addEventListener('pointerup',finishCommissionImageDrag);commissionImageOriginal?.addEventListener('pointercancel',finishCommissionImageDrag);
commissionImageDialog?.addEventListener('close',resetCommissionImageView);
const hoverTiltEnabled = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
if (hoverTiltEnabled) document.querySelectorAll('.commission-title-row,.commission-hero-art').forEach(target => {
  target.addEventListener('pointermove', event => {
    const bounds = target.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - .5;
    const vertical = (event.clientY - bounds.top) / bounds.height - .5;
    const rotateX = (-vertical * 5).toFixed(2);
    const rotateY = (horizontal * 7).toFixed(2);
    target.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px) scale(1.025)`;
  });
  target.addEventListener('pointerleave', () => { target.style.transform = ''; });
});
document.addEventListener('nnytro:currency-change', event => { displayCurrency = event.detail?.currency || 'USD'; updateDisplayedPrices(); });
document.addEventListener('nnytro:language-applied', updateDisplayedPrices);
document.addEventListener('click', event => { const button = event.target.closest('[data-add-service]'); if (!button) return; const id = button.dataset.addService; if (!allServices.some(item => item.id === id)) return; cart[id] = (Number(cart[id]) || 0) + 1; saveCart(); renderCart(); setCartOpen(true); });
cartItems.addEventListener('click', event => { const button = event.target.closest('[data-remove-service]'); if (!button) return; const id = button.dataset.removeService; const quantity = Number(cart[id]) || 0; if (quantity <= 1) delete cart[id]; else cart[id] = quantity - 1; saveCart(); renderCart(); });
cartToggle.addEventListener('click', () => setCartOpen(false, true));
cartReopen.addEventListener('click', () => setCartOpen(true, true));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && cartRoot.dataset.open === 'true') setCartOpen(false, true); });
sendOrder.addEventListener('click', () => { void openOrderDialog(); });
orderLoginBack?.addEventListener('click',()=>{setOrderLoginGate(false);orderAuthProvidersRequest=null;try{sessionStorage.removeItem(orderLoginReturnKey)}catch{}});
orderAuthLinks.forEach(link=>link.addEventListener('click',event=>{if(link.getAttribute('aria-disabled')==='true'){event.preventDefault();return}try{sessionStorage.setItem(orderLoginReturnKey,'./comisiones.html?resumeOrder=1')}catch{event.preventDefault();orderLoginStatus.textContent=t('No se pudo guardar el pedido antes de iniciar sesión. Activá el almacenamiento del navegador y probá de nuevo.')}}));
orderDialog.addEventListener('close',()=>{try{sessionStorage.removeItem(orderLoginReturnKey)}catch{}});
submitRequest.addEventListener('click', async () => {
  const selected = allServices.filter(item => Number(cart[item.id]) > 0).map(item => ({ id: item.id, name: item.name, quantity: Number(cart[item.id]) }));
  if (!selected.length || !clientContact.validity.valid) { clientContact.reportValidity(); return; }
  if (liveApiMode) {
    submitRequest.disabled=true;copyStatus.textContent='Enviando pedido al servidor seguro…';
    try {
      const authResponse=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});const auth=authResponse.ok?await authResponse.json():{user:null};
      if(!auth.user){setOrderLoginGate(true);submitRequest.disabled=false;return}
      const profile=(()=>{try{return JSON.parse(localStorage.getItem(profileKey)||'{}')}catch{return{}}})();
      const items=selected.map(item=>({id:item.id==='saludo'?'un-saludo':item.id,quantity:item.quantity}));
      const response=await fetch('/api/orders',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({items,contact:clientContact.value.trim(),details:clientDetails.value.trim(),displayName:String(profile.name||auth.user.name||'').trim()})});
      const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||`No se pudo enviar (${response.status})`);
      Object.keys(cart).forEach(key=>delete cart[key]);saveCart();renderCart();
      showRequestSuccess();return;
    } catch(error) {copyStatus.textContent=`No se pudo enviar el pedido: ${error.message}`;submitRequest.disabled=false;return}
  }
  const orders = loadOrders();
  const id = `NN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const profile = (() => { try { return JSON.parse(localStorage.getItem(profileKey) || '{}'); } catch { return {}; } })();
  orders.push({ id, createdAt: new Date().toISOString(), items: selected, customerName: String(profile.name || '').trim().slice(0, 48), clientContact: clientContact.value.trim(), details: clientDetails.value.trim(), status: 'requested', contactCheckedByClient: true, spokeConfirmed: false, total: null, paymentPlan: null, paymentUrl: '' });
  saveOrders(orders); Object.keys(cart).forEach(key => delete cart[key]); saveCart(); renderCart();
  showRequestSuccess();
});
renderMailModeCopy();
document.addEventListener('nnytro:language-applied', () => { renderCatalog(); renderCart(); renderMailModeCopy(); if (orderDialog.open) refreshOrderText(); });
clearCart.addEventListener('click', () => { Object.keys(cart).forEach(id => delete cart[id]); saveCart(); renderCart(); });
orderDialog.addEventListener('click', event => { if (event.target === orderDialog) orderDialog.close(); });
