(() => {
  const feed = document.querySelector('[data-home-news]');
  if (!feed) return;
  // Keep the homepage announcement directly under the intro copy.
  const intro = document.querySelector('.home-intro');
  const isHomePage = location.pathname === '/' || /(?:^|\/)index(?:\.html)?\/?$/i.test(location.pathname);
  if (intro && isHomePage) intro.append(feed);
  const dismissedKey = 'nnytro-dismissed-news-v1';
  const api = async (path, options = {}) => {
    const response = await fetch(`/api/${path}`, {
      credentials: 'same-origin', cache: 'no-store', ...options,
      headers: { ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || `Error del servidor (${response.status})`);
    return data;
  };
  const dismissed = () => { try { return new Set(JSON.parse(localStorage.getItem(dismissedKey) || '[]')); } catch { return new Set(); } };
  function render(items) {
    feed.replaceChildren();
    for (const item of items.filter(entry => entry.isPublished && !dismissed().has(entry.id)).slice(0, 4)) {
      const card = document.createElement('article'); card.className = 'home-news-card';
      const link = document.createElement('a'); link.className = 'home-news-link'; link.href = item.href;
      if (item.imageUrl) { const isVideo = /\.(mp4|webm)(?:$|\?)/i.test(item.imageUrl); const image = document.createElement(isVideo ? 'video' : 'img'); image.src = item.imageUrl; if (isVideo) { image.muted = true; image.loop = true; image.autoplay = true; image.playsInline = true; image.preload = 'metadata'; } else { image.alt = ''; image.loading = 'lazy'; } link.append(image); }
      const copy = document.createElement('span'); copy.className = 'home-news-copy';
      const eyebrow = document.createElement('small'); eyebrow.textContent = 'NOVEDAD';
      const title = document.createElement('strong'); title.textContent = item.title;
      copy.append(eyebrow, title);
      if (item.body) { const body = document.createElement('span'); body.textContent = item.body; copy.append(body); }
      const go = document.createElement('b'); go.setAttribute('aria-hidden', 'true'); go.textContent = '↗'; copy.append(go);
      link.append(copy);
      const close = document.createElement('button'); close.type = 'button'; close.className = 'home-news-dismiss'; close.setAttribute('aria-label', 'Cerrar novedad'); close.textContent = '×';
      close.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        const ids = dismissed(); ids.add(item.id);
        try { localStorage.setItem(dismissedKey, JSON.stringify([...ids])); } catch {}
        card.remove(); if (!feed.querySelector('.home-news-card')) feed.hidden = true;
      });
      card.append(link, close); feed.append(card);
    }
    feed.hidden = !feed.childElementCount;
    intro?.classList.toggle('home-intro--with-news', !feed.hidden);
  }
  async function load() { try { const result = await api('news'); render(result.items || []); } catch { feed.hidden = true; } }

  const modal = document.createElement('section');
  modal.className = 'home-news-admin'; modal.hidden = true;
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'home-news-admin-title');
  modal.innerHTML = '<div class="home-news-admin-backdrop" data-news-close></div><form class="home-news-admin-panel"><header><div><small>NNYTRO / INICIO</small><h2 id="home-news-admin-title">Novedades</h2></div><button type="button" data-news-close aria-label="Cerrar">×</button></header><div class="home-news-admin-columns"><section class="home-news-admin-list"><div class="home-news-admin-list-heading"><strong>Publicaciones</strong><button type="button" data-news-new>＋ Nueva</button></div><div data-news-items></div></section><fieldset><legend data-news-form-title>Nueva novedad</legend><label>Título<input name="title" maxlength="120" required></label><label>Texto breve<textarea name="body" rows="3" maxlength="500"></textarea></label><label>Enlace de destino<input name="href" value="/comisiones.html" maxlength="300" required placeholder="/comisiones.html"></label><label>Imagen o video (opcional)<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"></label><small>JPG, PNG, WEBP, GIF, MP4 y WEBM de hasta 24 MB por archivo.</small><label class="home-news-published"><input name="published" type="checkbox" checked> Mostrar en el inicio</label><p class="home-news-admin-status" role="status" aria-live="polite"></p><footer><button type="button" data-news-delete hidden>Borrar novedad</button><span></span><button type="submit" data-news-save>Publicar</button></footer></fieldset></div></form>';
  document.body.append(modal);
  const form = modal.querySelector('form'), list = modal.querySelector('[data-news-items]'), status = modal.querySelector('.home-news-admin-status');
  let editing = null, items = [];
  function fill(item = null) {
    editing = item; form.reset(); form.elements.title.value = item?.title || ''; form.elements.body.value = item?.body || ''; form.elements.href.value = item?.href || '/comisiones.html'; form.elements.published.checked = item?.isPublished !== false;
    modal.querySelector('[data-news-form-title]').textContent = item ? 'Editar novedad' : 'Nueva novedad'; modal.querySelector('[data-news-save]').textContent = item ? 'Guardar cambios' : 'Publicar'; modal.querySelector('[data-news-delete]').hidden = !item; status.textContent = '';
  }
  function renderAdminList() {
    list.replaceChildren();
    for (const item of items) {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'home-news-admin-item';
      const title = document.createElement('strong'); title.textContent = item.title;
      const state = document.createElement('small'); state.textContent = item.isPublished ? 'Visible en el inicio' : 'Oculta';
      row.append(title, state); row.addEventListener('click', () => fill(item)); list.append(row);
    }
    if (!items.length) { const empty = document.createElement('p'); empty.textContent = 'Todavía no hay novedades.'; list.append(empty); }
  }
  async function refreshAdmin() { const result = await api('admin/news'); items = result.items || []; renderAdminList(); render(items); }
  async function openManager() {
    modal.hidden = false; fill(null); status.textContent = 'Cargando novedades…';
    try { await refreshAdmin(); status.textContent = ''; } catch (error) { status.textContent = error.message; }
    modal.querySelector('[name="title"]').focus();
  }
  document.addEventListener('nnytro:open-news-manager', () => void openManager());
  modal.addEventListener('click', event => {
    if (event.target.closest('[data-news-close]')) modal.hidden = true;
    if (event.target.closest('[data-news-new]')) fill(null);
    if (event.target.closest('[data-news-delete]') && editing && window.confirm(`¿Borrar “${editing.title}”?`)) {
      api(`admin/news/${encodeURIComponent(editing.id)}`, { method: 'DELETE' }).then(async () => { fill(null); await refreshAdmin(); }).catch(error => { status.textContent = error.message; });
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); const save = modal.querySelector('[data-news-save]'); save.disabled = true; status.textContent = 'Guardando novedad…';
    try {
      let imageUrl = editing?.imageUrl || '';
      const file = form.elements.image.files?.[0];
      if (file) { const data = new FormData(); data.set('file', file); imageUrl = (await api('media/upload', { method: 'POST', body: data })).url; }
      const payload = { title: form.elements.title.value.trim(), body: form.elements.body.value.trim(), href: form.elements.href.value.trim(), imageUrl, isPublished: form.elements.published.checked };
      await api(editing ? `admin/news/${encodeURIComponent(editing.id)}` : 'admin/news', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      await refreshAdmin(); fill(null); status.textContent = 'Novedad guardada.';
    } catch (error) { status.textContent = error.message; }
    finally { save.disabled = false; }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) modal.hidden = true; });
  void load();
})();
