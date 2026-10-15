(() => {
  const t = value => window.NNytroI18n?.t(value) || value;
  const DEMO_KEY = 'nnytro-completed-commissions-demo-v1';
  const REVIEW_KEY = 'nnytro-completed-reviews-demo-v1';
  const lightbox = document.querySelector('.example-lightbox');
  const lightboxImage = lightbox?.querySelector('img');
  document.querySelectorAll('.entry--example .example-image-open').forEach(button => button.addEventListener('click', () => {
    const image = button.querySelector('img');
    if (!image || !lightbox || !lightboxImage) return;
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightbox.showModal();
  }));
  lightbox?.querySelector('.example-lightbox-close')?.addEventListener('click', () => lightbox.close());
  lightbox?.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
  const root = document.querySelector('#entries');
  const count = document.querySelector('#count');
  const template = document.querySelector('#entry-template');
  let renderedEntries = [];
  let renderedMode = 'demo';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isLocalPreview = location.protocol === 'file:' || (location.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(location.hostname));
  const money = (amount, currency) => amount == null || amount === '' ? t('No indicado') : `${esc(currency || 'USD')} ${Number(amount).toFixed(2)}`;
  const parseList = value => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value) return [];
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  };
  const localRead = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const localeDate = value => {
    const locale = window.NNytroI18n?.getLanguage() || 'es';
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? t('FINALIZADA') : date.toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : locale === 'en' ? 'en-US' : 'es-AR');
  };

  function showUnavailable(message) {
    count.textContent = t('Archivo no disponible');
    root.innerHTML = `<div class="empty" role="status"><h3>${esc(t('No pudimos cargar las comisiones realizadas.'))}</h3><p>${esc(message || t('El archivo no está disponible ahora. Probá de nuevo más tarde.'))}</p><button class="button" type="button" id="gallery-retry">${esc(t('Reintentar'))}</button></div>`;
    root.querySelector('#gallery-retry')?.addEventListener('click', load);
  }

  async function getData() {
    if (isLocalPreview) {
      const entries = localRead(DEMO_KEY);
      const reviewMap = localRead(REVIEW_KEY);
      return { mode: 'demo', entries: (Array.isArray(entries) ? entries : []).filter(item => item && item.published === true && item.completed === true && item.paid === true).map(item => ({
        id: item.id, title: item.title, clientName: item.clientName, category: item.category, brief: item.brief,
        initialQuote: item.initialQuote, finalQuote: item.finalQuote, currency: item.currency || 'USD', priceReason: item.priceReason,
        processVideo: item.processVideo, finalImages: parseList(item.finalImages), references: parseList(item.references), completedAt: item.completedAt,
        reviews: Array.isArray(reviewMap?.[item.id]) ? reviewMap[item.id] : []
      })) };
    }
    if (location.protocol !== 'https:') throw new Error(t('El archivo de comisiones está disponible solo en la vista local o en el sitio seguro HTTPS.'));
    const response = await fetch('/api/gallery', { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 503 ? t('El servicio del archivo está temporalmente fuera de servicio.') : t('El servidor no pudo cargar las publicaciones.'));
    const data = await response.json();
    if (!data || !Array.isArray(data.commissions)) throw new Error(t('El servidor devolvió una respuesta inválida.'));
    return { mode: 'production', entries: data.commissions.map(row => ({
      id: row.id,
      title: row.title,
      clientName: row.chosen_name,
      category: t('COMISIÓN'),
      brief: row.brief,
      initialQuote: row.initial_price,
      finalQuote: row.final_price,
      currency: row.price_currency || 'BRL',
      priceReason: row.price_change_reason,
      processVideo: row.process_video_url,
      finalImages: parseList(row.final_images_json),
      references: parseList(row.reference_images_json),
      completedAt: row.published_at,
      reviews: row.rating === null || row.rating === undefined ? [] : [{ stars: row.rating, name: row.chosen_name || '', text: row.comment || '' }]
    })) };
  }

  function render(entries, mode) {
    const formState = new Map();
    root.querySelectorAll('.entry').forEach(card => {
      const values = {};
      card.querySelectorAll('input, textarea, select, [data-stars]').forEach((field, index) => {
        const key = field.matches('[data-stars]') ? `star-${field.dataset.stars}` : `${field.name || field.type || field.tagName}-${index}`;
        values[key] = field.matches('[data-stars]') ? field.getAttribute('aria-checked') === 'true' : (field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value);
      });
      formState.set(card.dataset.id, values);
    });
    renderedEntries = entries;
    renderedMode = mode;
    root.replaceChildren();
    count.textContent = `${entries.length} ${entries.length === 1 ? t('trabajo') : t('trabajos')}`;
    if (!entries.length) {
      root.innerHTML = `<div class="empty"><h3>${esc(t('Todavía no hay comisiones publicadas.'))}</h3><p>${esc(t('Las publicaciones aparecen acá cuando el trabajo está terminado y el pago confirmado.'))}</p><a class="button" href="./comisiones.html">${esc(t('Ver opciones ↗'))}</a></div>`;
      return;
    }
    for (const item of entries.slice().sort((a,b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))) {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector('.entry');
      card.dataset.id = item.id || '';
      card.querySelector('.entry-kicker').textContent = `${t(item.category || 'COMISIÓN')} · ${localeDate(item.completedAt)}`;
      card.querySelector('h3').textContent = item.title || t('Encargo personalizado');
      const clientThanks = card.querySelector('.client-thanks');
      clientThanks.textContent = item.clientName ? `${t('Gracias')} ${item.clientName} ${t('por confiar en NNytro')} ${t('por comisionar.')}` : '';
      clientThanks.hidden = !item.clientName;
      const fillGallery = (selector, media, defaultCaption) => {
        const target = card.querySelector(selector);
        const list = Array.isArray(media) ? media : [];
        target.innerHTML = list.map(file => {
          const source = typeof file === 'string' ? file : file?.url;
          if (!source) return '';
          const alt = typeof file === 'string' ? defaultCaption : (file.alt || defaultCaption);
          const caption = typeof file === 'string' ? defaultCaption : (file.caption || defaultCaption);
          return `<figure class="media-tile"><img loading="lazy" src="${esc(source)}" alt="${esc(alt)}"><figcaption>${esc(caption)}</figcaption></figure>`;
        }).join('');
        if (!list.length) target.hidden = true;
      };
      fillGallery('.reference-grid', item.references, t('Referencia del pedido'));
      fillGallery('.final-gallery', item.finalImages, t('Resultado final'));
      const video = card.querySelector('.process');
      if (item.processVideo) { video.src = item.processVideo; video.hidden = false; }
      const brief = card.querySelector('.brief-grid');
      const cells = [[t('Pedido inicial'), item.brief], [t('Precio inicial'), money(item.initialQuote, item.currency)], [t('Precio final'), money(item.finalQuote, item.currency)], [t('Estado'), t('Terminada · pagada')]];
      brief.innerHTML = cells.map(([label,value]) => `<div class="brief-cell"><small>${esc(label)}</small><strong>${esc(value || t('No indicado'))}</strong></div>`).join('');
      const reason = card.querySelector('.reason');
      if (item.priceReason) { reason.textContent = `${t('El precio cambió porque:')} ${item.priceReason}`; reason.hidden = false; }
      const summary = card.querySelector('.review-summary');
      const entryReviews = Array.isArray(item.reviews) ? item.reviews : [];
      const ratingText = entryReviews.map(review => `${'★'.repeat(Math.max(0, Math.min(5, Number(review.stars) || 0)))}${'☆'.repeat(5 - Math.max(0, Math.min(5, Number(review.stars) || 0)))}`).join(' · ');
      summary.innerHTML = `<h4>${esc(t('Reseñas'))} <span class="rating">${ratingText}</span></h4>${entryReviews.length ? entryReviews.map(review => {
        const stars = Math.max(0, Math.min(5, Number(review.stars) || 0));
        return `<p>${review.name ? `<strong>${esc(review.name)}</strong> · ` : ''}${'★'.repeat(stars)}${'☆'.repeat(5-stars)}${review.text ? `<br>${esc(review.text)}` : ''}</p>`;
      }).join('') : `<p>${esc(t('Todavía no hay reseñas.'))}</p>`}`;

      const reviewForm = card.querySelector('.review-form');
      if (mode === 'production') {
        reviewForm.innerHTML = `<h4>${esc(t('¿Ya encargaste este trabajo?'))}</h4><p>${esc(t('Las reseñas se envían desde el perfil, vinculadas a un pedido terminado y pagado. Usá el botón gris de perfil arriba a la derecha.'))}</p>`;
      } else {
        const starRoot = card.querySelector('.stars');
        let selected = null;
        starRoot.innerHTML = [0,1,2,3,4,5].map(value => `<button type="button" class="star-choice" role="radio" aria-checked="false" aria-label="${value} ${esc(t('estrellas'))}" data-stars="${value}">${value ? '★' : '−'}</button>`).join('');
        starRoot.addEventListener('click', event => { const button = event.target.closest('[data-stars]'); if (!button) return; selected = Number(button.dataset.stars); starRoot.querySelectorAll('[data-stars]').forEach(node => node.setAttribute('aria-checked', String(Number(node.dataset.stars) === selected))); });
        reviewForm.addEventListener('submit', event => {
          event.preventDefault();
          const form = event.currentTarget;
          const status = card.querySelector('.review-status');
          if (selected === null) { status.textContent = t('Elegí una puntuación de 0 a 5.'); return; }
          const current = (() => { const value = localRead(REVIEW_KEY); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; })();
          current[item.id] = [...(Array.isArray(current[item.id]) ? current[item.id] : []), { stars: selected, name: form.elements.reviewer.value.trim(), text: form.elements.review.value.trim(), createdAt: new Date().toISOString() }];
          localStorage.setItem(REVIEW_KEY, JSON.stringify(current));
          status.textContent = t('Reseña guardada en esta demo local.');
          window.setTimeout(load, 500);
        });
      }
      root.append(fragment);
      const state = formState.get(String(item.id || ''));
      if (state) {
        const restored = root.lastElementChild;
        restored.querySelectorAll('input, textarea, select, [data-stars]').forEach((field, index) => {
          const key = field.matches('[data-stars]') ? `star-${field.dataset.stars}` : `${field.name || field.type || field.tagName}-${index}`;
          if (!(key in state)) return;
          if (field.matches('[data-stars]')) {
            if (state[key]) field.click();
            else field.setAttribute('aria-checked', 'false');
          }
          else if (field.type === 'checkbox' || field.type === 'radio') field.checked = state[key];
          else field.value = state[key];
        });
      }
    }
  }

  document.addEventListener('nnytro:language-applied', () => {
    if (renderedEntries.length) render(renderedEntries, renderedMode);
    else load();
  });

  async function load() {
    count.textContent = t('Cargando…');
    root.innerHTML = `<div class="empty" role="status">${esc(t('Cargando comisiones realizadas…'))}</div>`;
    try { const data = await getData(); render(data.entries, data.mode); }
    catch (error) { showUnavailable(error?.message || t('El archivo no está disponible ahora. Probá de nuevo más tarde.')); }
  }
  load();
})();
