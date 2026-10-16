(() => {
  const byId = id => document.getElementById(id);
  const adminContent = byId('portfolio-admin-content');
  const locked = byId('portfolio-locked');
  const pageStatus = byId('portfolio-page-status');
  const styleForm = byId('portfolio-style-form');
  const entryForm = byId('portfolio-entry-form');
  const entryList = byId('portfolio-entry-list');
  const currentMedia = byId('portfolio-current-media');
  let entries = [];
  let editingId = '';

  async function api(path, options = {}) {
    const response = await fetch(`/api/${path}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      headers: { ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(body.error || `Error del servidor (${response.status})`);
    return body;
  }

  function showLocked(message, showLogin = false) {
    adminContent.hidden = true;
    locked.hidden = false;
    byId('portfolio-auth-status').textContent = message;
    locked.querySelector('a').hidden = !showLogin;
  }

  function applyPreview(settings) {
    const root = document.documentElement;
    root.style.setProperty('--gallery-heading-font', `'${settings.headingFont}'`);
    root.style.setProperty('--gallery-heading-size', `${settings.headingSize}px`);
    root.style.setProperty('--gallery-card-font', `'${settings.cardFont}'`);
    root.style.setProperty('--gallery-card-title-size', `${settings.cardTitleSize}px`);
    root.style.setProperty('--gallery-card-min', `${settings.cardMinWidth}px`);
  }

  function fillSettings(settings) {
    for (const name of ['pageTitle', 'intro', 'headingFont', 'headingSize', 'cardFont', 'cardTitleSize', 'cardMinWidth']) {
      styleForm.elements[name].value = settings[name] ?? '';
    }
    applyPreview(settings);
  }

  function setEditor(entry) {
    editingId = entry?.id || '';
    entryForm.reset();
    entryForm.elements.id.value = editingId;
    entryForm.elements.title.value = entry?.title || '';
    entryForm.elements.category.value = entry?.category || 'portadas';
    entryForm.elements.description.value = entry?.description || '';
    entryForm.elements.isPublished.checked = entry ? Boolean(entry.isPublished) : true;
    entryForm.elements.media.required = !entry;
    byId('portfolio-new-heading').textContent = entry ? 'Editar publicación' : 'Crear una publicación';
    byId('portfolio-entry-save').textContent = entry ? 'Guardar publicación' : 'Publicar en el portfolio';
    byId('portfolio-entry-cancel').hidden = !entry;
    byId('portfolio-new-button').hidden = !entry;
    currentMedia.replaceChildren();
    currentMedia.hidden = !entry?.mediaUrl;
    if (entry?.mediaUrl) {
      const media = document.createElement(entry.type === 'video' ? 'video' : 'img');
      media.src = entry.mediaUrl;
      if (media instanceof HTMLVideoElement) { media.controls = true; media.preload = 'metadata'; }
      else { media.alt = `Vista previa: ${entry.title}`; }
      currentMedia.append(media);
    }
  }

  function renderEntries() {
    entryList.replaceChildren();
    byId('portfolio-entry-count').textContent = String(entries.length);
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'portfolio-admin-help';
      empty.textContent = 'Todavía no creaste publicaciones desde este panel.';
      entryList.append(empty);
      return;
    }
    for (const entry of entries) {
      const card = document.createElement('article');
      card.className = 'portfolio-admin-entry';
      const copy = document.createElement('div');
      copy.className = 'portfolio-admin-entry-copy';
      const title = document.createElement('strong');
      title.textContent = entry.title;
      const info = document.createElement('small');
      info.textContent = `${entry.category} · ${entry.isPublished ? 'Publicada' : 'Oculta'} · ${entry.type === 'video' ? 'Video' : 'Imagen'}`;
      copy.append(title, info);
      const actions = document.createElement('div');
      actions.className = 'portfolio-admin-entry-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Editar';
      edit.addEventListener('click', () => { setEditor(entry); entryForm.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'portfolio-admin-delete';
      remove.textContent = 'Borrar';
      remove.addEventListener('click', async () => {
        if (!window.confirm(`¿Borrar “${entry.title}” del portfolio?`)) return;
        remove.disabled = true;
        try { await api(`admin/portfolio/${encodeURIComponent(entry.id)}`, { method: 'DELETE' }); await loadData(); }
        catch (error) { pageStatus.textContent = error.message; remove.disabled = false; }
      });
      actions.append(edit, remove);
      card.append(copy, actions);
      entryList.append(card);
    }
  }

  async function loadData() {
    const data = await api('admin/portfolio');
    entries = data.items || [];
    fillSettings(data.settings);
    renderEntries();
    pageStatus.textContent = '';
  }

  styleForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = styleForm.querySelector('button[type="submit"]');
    const status = byId('portfolio-style-status');
    button.disabled = true;
    status.textContent = 'Guardando…';
    const settings = {
      pageTitle: styleForm.elements.pageTitle.value.trim(),
      intro: styleForm.elements.intro.value.trim(),
      headingFont: styleForm.elements.headingFont.value,
      headingSize: Number(styleForm.elements.headingSize.value),
      cardFont: styleForm.elements.cardFont.value,
      cardTitleSize: Number(styleForm.elements.cardTitleSize.value),
      cardMinWidth: Number(styleForm.elements.cardMinWidth.value)
    };
    try { const result = await api('admin/portfolio', { method: 'PUT', body: JSON.stringify(settings) }); fillSettings(result.settings); status.textContent = 'Apariencia guardada. Ya se ve en el portfolio.'; }
    catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });

  for (const name of ['headingFont', 'headingSize', 'cardFont', 'cardTitleSize', 'cardMinWidth']) {
    styleForm.elements[name].addEventListener('input', () => {
      applyPreview({ headingFont: styleForm.elements.headingFont.value, headingSize: Number(styleForm.elements.headingSize.value), cardFont: styleForm.elements.cardFont.value, cardTitleSize: Number(styleForm.elements.cardTitleSize.value), cardMinWidth: Number(styleForm.elements.cardMinWidth.value) });
    });
  }

  byId('portfolio-new-button').addEventListener('click', () => { setEditor(null); entryForm.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  byId('portfolio-entry-cancel').addEventListener('click', () => { setEditor(null); byId('portfolio-entry-status').textContent = ''; });
  entryForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = byId('portfolio-entry-save');
    const status = byId('portfolio-entry-status');
    button.disabled = true;
    status.textContent = 'Preparando publicación…';
    try {
      let mediaUrl;
      const file = entryForm.elements.media.files[0];
      if (file) {
        status.textContent = 'Subiendo archivo…';
        const formData = new FormData();
        formData.set('file', file);
        mediaUrl = (await api('media/upload', { method: 'POST', body: formData })).url;
      }
      const payload = { title: entryForm.elements.title.value.trim(), category: entryForm.elements.category.value, description: entryForm.elements.description.value.trim(), isPublished: entryForm.elements.isPublished.checked };
      if (mediaUrl) payload.mediaUrl = mediaUrl;
      if (!editingId && !mediaUrl) throw Error('Elegí una imagen o un video para la publicación.');
      status.textContent = 'Guardando…';
      if (editingId) await api(`admin/portfolio/${encodeURIComponent(editingId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await api('admin/portfolio', { method: 'POST', body: JSON.stringify(payload) });
      setEditor(null);
      status.textContent = 'Publicación guardada. La tarjeta ya se generó en el portfolio.';
      await loadData();
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });

  async function initialize() {
    try {
      const { user } = await api('auth/me');
      if (!user) { showLocked('Iniciá sesión con Google usando nnytro.online@gmail.com para abrir este panel.', true); return; }
      if (!user.isAdmin || user.email?.toLowerCase() !== 'nnytro.online@gmail.com') { showLocked('Este panel solo está disponible para la cuenta de Google nnytro.online@gmail.com.'); return; }
      locked.hidden = true;
      adminContent.hidden = false;
      await loadData();
      if (location.hash === '#new-publication') { setEditor(null); setTimeout(() => entryForm.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120); }
    } catch (error) { showLocked(error.message, false); }
  }

  setEditor(null);
  if (location.hash === '#new-publication') byId('portfolio-entry-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  void initialize();
})();
