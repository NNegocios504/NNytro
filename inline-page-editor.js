(() => {
  const toggle = document.querySelector('.site-editor-toggle');
  if (!toggle) return;
  const page = location.pathname.split('/').pop().replace(/\.html?$/i, '') || 'index';
  const toolbar = document.createElement('aside');
  toolbar.className = 'inline-editor-toolbar';
  toolbar.hidden = true;
  toolbar.setAttribute('aria-label', 'Editor visual de página');
  toolbar.innerHTML = '<div class="inline-editor-top"><strong>NNYTRO / EDICIÓN</strong><small data-backup-count>0 respaldos</small><button type="button" data-action="undo" aria-label="Deshacer" title="Deshacer">↶</button><button type="button" data-action="redo" aria-label="Rehacer" title="Rehacer">↷</button><button type="button" data-action="close" aria-label="Cerrar menú de edición" title="Cerrar menú de edición">×</button></div><p class="inline-editor-hint">Hacé clic en un texto o imagen para editarlo. Los cambios se guardan solos.</p><label class="inline-editor-text-field">Texto<textarea rows="2" maxlength="3000" data-field="text" disabled></textarea></label><div class="inline-editor-style"><label>Fuente<select data-field="font" disabled><option value="Crosner">Crosner</option><option value="Comico">Comico</option></select></label><label>Tamaño<input data-field="size" type="number" min="8" max="160" disabled /></label><label>Color<input data-field="color" type="color" value="#ffffff" disabled /></label></div><div class="inline-editor-actions"><button type="button" data-action="image" disabled>Cambiar imagen</button><button type="button" data-action="add-text" disabled>＋ Texto</button><button type="button" data-action="add-image" disabled>＋ Imagen</button><input type="file" data-field="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden /></div><p class="inline-editor-status" role="status" aria-live="polite"></p>';
  if (page === 'index') {
    const newsButton = document.createElement('button');
    newsButton.type = 'button'; newsButton.dataset.action = 'news'; newsButton.textContent = 'Novedades';
    toolbar.querySelector('.inline-editor-top').insertBefore(newsButton, toolbar.querySelector('[data-action="undo"]'));
  }
  document.body.append(toolbar);
  const status = toolbar.querySelector('.inline-editor-status');
  const textField = toolbar.querySelector('[data-field="text"]');
  const fontField = toolbar.querySelector('[data-field="font"]');
  const sizeField = toolbar.querySelector('[data-field="size"]');
  const colorField = toolbar.querySelector('[data-field="color"]');
  const fileField = toolbar.querySelector('[data-field="file"]');
  let selected = null;
  let editingEnabled = false;
  let state = { current: { elements: {}, insertions: [] }, undo: [], redo: [], versions: [] };
  let saveQueue = Promise.resolve();
  let debounceTimer;
  let pendingChange = null;
  let textIndex = 0;
  let imageIndex = 0;

  const api = async (body) => {
    const response = await fetch(body ? '/api/page-editor' : `/api/page-editor?page=${encodeURIComponent(page)}`, {
      method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || `Error (${response.status})`);
    return data;
  };
  const editorKey = (node) => node.dataset.inlineEditorKey || '';
  const blocked = (node) => Boolean(node.closest('header,nav,footer,button,a,form,dialog,[role="dialog"],.inline-editor-toolbar,.gallery-card,.gallery-modal,.site-notifications,.support-ticket-columns,.profile-orders,.profile-account-links'));
  const eligibleText = (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 1 && node.parentElement?.closest('main') && !blocked(node.parentElement) && (/^(H[1-6]|P|LI|FIGCAPTION|BLOCKQUOTE|SMALL|STRONG|EM|LABEL)$/.test(node.parentElement.tagName) || (node.parentElement.tagName === 'SPAN' && Boolean(node.parentElement.closest('h1,h2,h3,h4,h5,h6,p,li,blockquote'))));
  function prepareNodes(root = document) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) if (eligibleText(walker.currentNode)) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      if (node.parentElement?.dataset.inlineEditorKey) continue;
      const span = document.createElement('span');
      span.dataset.inlineEditorKey = `t-${textIndex++}`;
      span.dataset.inlineEditorBase = node.textContent;
      node.parentNode.replaceChild(span, node);
      span.append(node);
    }
    for (const img of document.querySelectorAll('main img:not([data-inline-editor-key])')) {
      if (blocked(img)) continue;
      img.dataset.inlineEditorKey = `i-${imageIndex++}`;
    }
  }
  function applyState() {
    const current = state.current || { elements: {}, insertions: [] };
    document.querySelectorAll('[data-inline-editor-key^="insert-new-"]').forEach(node => node.remove());
    for (const [key, value] of Object.entries(current.elements || {})) {
      const element = document.querySelector(`[data-inline-editor-key="${CSS.escape(key)}"]`);
      if (!element) continue;
      if (typeof value.text === 'string') element.textContent = value.text;
      if (typeof value.src === 'string' && element instanceof HTMLImageElement) element.src = value.src;
      if (value.font) element.style.fontFamily = `'${value.font}', sans-serif`;
      if (value.size) element.style.fontSize = `${value.size}px`;
      if (value.color) element.style.color = value.color;
    }
    for (const item of current.insertions || []) {
      if (document.querySelector(`[data-inline-editor-key="insert-${CSS.escape(item.id)}"]`)) continue;
      const anchor = document.querySelector(`[data-inline-editor-key="${CSS.escape(item.after)}"]`);
      if (!anchor) continue;
      const block = anchor.closest('p,h1,h2,h3,h4,h5,h6,li,figure') || anchor;
      const node = document.createElement(item.tag);
      node.dataset.inlineEditorKey = `insert-${item.id}`;
      node.dataset.inlineEditorBase = item.text || '';
      if (item.tag === 'img') { node.src = item.src; node.alt = 'Imagen agregada'; node.loading = 'lazy'; node.style.maxWidth = '100%'; }
      else { node.textContent = item.text || 'Nuevo texto'; node.style.margin = '.5rem 0'; }
      block.insertAdjacentElement('afterend', node);
    }
    for (const [key, value] of Object.entries(current.elements || {})) {
      const element = document.querySelector(`[data-inline-editor-key="${CSS.escape(key)}"]`);
      if (!element) continue;
      if (typeof value.text === 'string') element.textContent = value.text;
      if (typeof value.src === 'string' && element instanceof HTMLImageElement) element.src = value.src;
      if (value.font) element.style.fontFamily = `'${value.font}', sans-serif`;
      if (value.size) element.style.fontSize = `${value.size}px`;
      if (value.color) element.style.color = value.color;
    }
  }
  function updateHistoryButtons() {
    toolbar.querySelector('[data-action="undo"]').disabled = !state.undo?.length;
    toolbar.querySelector('[data-action="redo"]').disabled = !state.redo?.length;
    toolbar.querySelector('[data-backup-count]').textContent = `${state.versions?.length || 0} respaldos`;
  }
  function updateFields() {
    const key = editorKey(selected);
    const value = state.current?.elements?.[key] || {};
    const isText = selected instanceof HTMLElement && selected.tagName !== 'IMG';
    textField.disabled = !isText;
    fontField.disabled = !isText;
    sizeField.disabled = !isText;
    colorField.disabled = !isText;
    toolbar.querySelector('[data-action="image"]').disabled = !(selected instanceof HTMLImageElement);
    toolbar.querySelector('[data-action="add-text"]').disabled = !selected;
    toolbar.querySelector('[data-action="add-image"]').disabled = !selected;
    if (selected) {
      textField.value = selected.textContent || '';
      fontField.value = value.font || 'Crosner';
      sizeField.value = value.size || Math.round(parseFloat(getComputedStyle(selected).fontSize) || 18);
      colorField.value = value.color || '#ffffff';
    } else { textField.value = ''; }
  }
  function pick(element) {
    selected?.classList.remove('inline-editor-selected');
    selected?.removeAttribute('contenteditable');
    selected = element;
    selected?.classList.add('inline-editor-selected');
    updateFields();
  }
  function commitPending() {
    if (!pendingChange) return saveQueue;
    const pending = pendingChange;
    pendingChange = null;
    status.textContent = 'Guardando y creando respaldo…';
    saveQueue = saveQueue.then(async () => {
      const result = await api({ page, action: 'set', key: pending.key, change: pending.change });
      state = result.state;
      updateHistoryButtons();
      status.textContent = 'Guardado. Podés deshacerlo con ↶.';
    }).catch(error => { status.textContent = error.message; });
    return saveQueue;
  }
  function save(change) {
    if (!selected) return;
    const key = editorKey(selected);
    if (!key) return;
    pendingChange = { key, change };
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { void commitPending(); }, 550);
  }
  async function history(action) {
    clearTimeout(debounceTimer);
    await commitPending();
    await saveQueue;
    try { status.textContent = 'Restaurando versión…'; const result = await api({ page, action }); state = result.state; applyState(); if (selected) pick(document.querySelector(`[data-inline-editor-key="${CSS.escape(editorKey(selected))}"]`)); updateHistoryButtons(); status.textContent = action === 'undo' ? 'Cambio deshecho.' : 'Cambio rehecho.'; }
    catch (error) { status.textContent = error.message; }
  }
  async function upload(file) {
    const form = new FormData(); form.set('file', file);
    const response = await fetch('/api/media/upload', { method: 'POST', credentials: 'same-origin', body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || `No se pudo subir el archivo (${response.status})`);
    return data.url;
  }
  async function addElement(tag) {
    if (!selected) return;
    try {
      let text = '';
      let src = '';
      if (tag === 'p') { text = window.prompt('Texto nuevo para esta página:') || ''; if (!text.trim()) return; }
      else { fileField.accept = 'image/jpeg,image/png,image/webp,image/gif'; fileField.click(); fileField.onchange = async () => { const file = fileField.files?.[0]; if (!file) return; try { status.textContent = 'Subiendo imagen…'; src = await upload(file); await insert('img', '', src); } catch (error) { status.textContent = error.message; } finally { fileField.value = ''; } }; return; }
      await insert(tag, text, src);
    } catch (error) { status.textContent = error.message; }
  }
  async function insert(tag, text, src) {
    const item = { id: `new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, after: editorKey(selected), tag, text, src };
    try { status.textContent = 'Guardando y creando respaldo…'; const result = await api({ page, action: 'insert', insertion: item }); state = result.state; applyState(); pick(document.querySelector(`[data-inline-editor-key="insert-${CSS.escape(item.id)}"]`)); updateHistoryButtons(); status.textContent = 'Elemento agregado y guardado.'; }
    catch (error) { status.textContent = error.message; }
  }

  toggle.addEventListener('click', async () => {
    if (!editingEnabled) {
      editingEnabled = true;
      toolbar.hidden = false;
      document.body.classList.add('inline-editor-active');
      toggle.setAttribute('aria-pressed', 'true');
      document.dispatchEvent(new CustomEvent('site-editor-mode-change', { detail: { active: true } }));
      prepareNodes(); applyState(); updateHistoryButtons(); status.textContent = 'Modo edición activo.';
      return;
    }
    if (toolbar.hidden) { toolbar.hidden = false; return; }
    toolbar.hidden = true;
    editingEnabled = false;
    document.body.classList.remove('inline-editor-active');
    toggle.setAttribute('aria-pressed', 'false');
    document.dispatchEvent(new CustomEvent('site-editor-mode-change', { detail: { active: false } }));
    selected?.classList.remove('inline-editor-selected');
    selected?.removeAttribute('contenteditable');
    selected = null;
  });
  toolbar.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') toolbar.hidden = true;
    if (action === 'news') document.dispatchEvent(new CustomEvent('nnytro:open-news-manager'));
    if (action === 'undo' || action === 'redo') void history(action);
    if (action === 'image' && selected instanceof HTMLImageElement) { fileField.accept = 'image/jpeg,image/png,image/webp,image/gif'; fileField.click(); }
    if (action === 'add-text') void addElement('p');
    if (action === 'add-image') void addElement('img');
  });
  fileField.addEventListener('change', async () => {
    const file = fileField.files?.[0]; if (!file || !(selected instanceof HTMLImageElement)) return;
    try { status.textContent = 'Subiendo imagen…'; const src = await upload(file); selected.src = src; save({ src }); status.textContent = 'Imagen subida; guardando…'; }
    catch (error) { status.textContent = error.message; }
    finally { fileField.value = ''; }
  });
  textField.addEventListener('input', () => { if (!selected || selected.tagName === 'IMG') return; selected.textContent = textField.value; save({ text: textField.value }); });
  fontField.addEventListener('change', () => { if (!selected) return; selected.style.fontFamily = `'${fontField.value}', sans-serif`; save({ font: fontField.value }); });
  sizeField.addEventListener('change', () => { const size = Number(sizeField.value); if (!selected || !Number.isFinite(size) || size < 8 || size > 160) return; selected.style.fontSize = `${size}px`; save({ size }); });
  colorField.addEventListener('input', () => { if (!selected) return; selected.style.color = colorField.value; save({ color: colorField.value }); });
  document.addEventListener('click', event => {
    if (toolbar.hidden || toolbar.contains(event.target) || event.target.closest('.site-editor-toggle')) return;
    const target = event.target.closest('[data-inline-editor-key]');
    if (target && !blocked(target)) { event.preventDefault(); event.stopPropagation(); pick(target); }
  }, true);
  document.addEventListener('dblclick', event => {
    if (!toolbar.hidden && selected && event.target.closest('[data-inline-editor-key]') === selected && selected.tagName !== 'IMG') { selected.contentEditable = 'true'; selected.focus(); }
  });
  if (page === 'galeria') {
    const grid = document.querySelector('#gallery-grid');
    const galleryModal = document.querySelector('#gallery-modal');
    const galleryInfo = galleryModal?.querySelector('.gallery-modal-info');
    const modal = document.createElement('section');
    modal.className = 'inline-gallery-post-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'inline-gallery-post-title');
    modal.innerHTML = '<form class="inline-gallery-post-form"><div class="inline-gallery-post-heading"><div><small>NNYTRO / PORTFOLIO</small><h2 id="inline-gallery-post-title">Nueva publicación</h2></div><button type="button" data-post-close aria-label="Cerrar">×</button></div><label>Título<input name="title" maxlength="120" required placeholder="Nombre de la publicación"></label><label>Categoría<select name="category" required><option value="portadas">Portadas</option><option value="menus">Menús</option><option value="renders">Renders</option><option value="dibujos">Dibujos</option><option value="modeloss blockbench">Modelos Blockbench</option><option value="matt">Matt</option><option value="skins">Skins</option><option value="under news">Under News</option></select></label><label>Descripción<textarea name="description" maxlength="1200" rows="3" placeholder="Opcional"></textarea></label><label>Visores 3D de Sketchfab (opcional)<textarea name="sketchfab" maxlength="2400" rows="3" placeholder="Pegá un enlace por línea"></textarea></label><small class="inline-gallery-media-hint">Podés agregar varios modelos, uno por línea. Si tienen animaciones, se pueden controlar desde el visor. Borrá los enlaces para quitarlos.</small><section class="inline-gallery-current-media" data-media-list aria-label="Archivos de la publicación"></section><label>Agregar imágenes o videos<input name="media" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple></label><small class="inline-gallery-media-hint" data-media-hint>Podés agregar hasta 20 archivos JPG, PNG, WEBP, GIF, MP4 o WEBM de hasta 24 MB cada uno.</small><p class="inline-gallery-post-status" role="status" aria-live="polite"></p><div class="inline-gallery-post-actions"><button type="button" class="inline-gallery-delete" data-post-delete hidden>Borrar publicación</button><span></span><button type="button" data-post-cancel>Cancelar</button><button type="submit" data-post-save>Crear publicación</button></div></form>';
    document.body.append(modal);
    const form = modal.querySelector('form');
    const postStatus = modal.querySelector('.inline-gallery-post-status');
    const mediaList = modal.querySelector('[data-media-list]');
    let editingPost = null;
    let activeProject = null;
    let organizerGroups = [];
    const postApi = async (path, options = {}) => {
      const response = await fetch(`/api/${path}`, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(data.error || `Error del servidor (${response.status})`);
      return data;
    };
    const postFromProject = project => {
      const custom = project?.items?.find(item => item.adminEntryId);
      const mediaUrls = [...new Set(custom?.mediaUrls?.length ? custom.mediaUrls : project?.items?.map(item => new URL(item.src, location.href).href) || [])];
      return { id: custom?.adminEntryId || '', sourceKey: custom?.sourceKey || project?.sourceKey || project?.key || '', title: project?.title || '', category: project?.category || 'portadas', description: project?.description || '', sketchfabModels: project?.sketchfabModels || [], mediaUrls };
    };
    const postFromCard = card => ({
      id: card.dataset.adminEntryId || '',
      sourceKey: card.dataset.adminEntrySourceKey || card.dataset.portfolioProjectKey || '',
      title: card.dataset.adminEntryTitle || card.dataset.portfolioProjectTitle || '',
      category: card.dataset.adminEntryCategory || card.dataset.portfolioProjectCategory || 'portadas',
      description: card.dataset.adminEntryDescription || card.dataset.portfolioProjectDescription || '',
      sketchfabModels: JSON.parse(card.dataset.adminEntrySketchfabModels || card.dataset.portfolioProjectSketchfabModels || '[]'),
      mediaUrls: JSON.parse(card.dataset.adminEntryMedia || card.dataset.portfolioProjectMedia || '[]').map(src => new URL(src, location.href).href)
    });
    const refreshMediaList = () => {
      mediaList.replaceChildren();
      const mediaUrls = editingPost?.mediaUrls || [];
      mediaList.hidden = !mediaUrls.length;
      mediaUrls.forEach((src, index) => {
        const item = document.createElement('div');
        item.className = 'inline-gallery-current-media-item';
        const url = new URL(src, location.href).href;
        const preview = /\.(mp4|webm)(?:$|\?)/i.test(url) ? document.createElement('video') : document.createElement('img');
        preview.src = url;
        if (preview instanceof HTMLVideoElement) { preview.muted = true; preview.playsInline = true; preview.preload = 'metadata'; }
        else { preview.alt = `Archivo ${index + 1}`; preview.loading = 'lazy'; }
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.title = 'Quitar este archivo';
        remove.setAttribute('aria-label', `Quitar archivo ${index + 1}`);
        remove.addEventListener('click', () => { editingPost.mediaUrls.splice(index, 1); refreshMediaList(); });
        item.append(preview, remove);
        mediaList.append(item);
      });
    };
    const openPost = post => {
      editingPost = post ? { ...post, mediaUrls: [...post.mediaUrls] } : null;
      form.reset();
      form.elements.title.value = editingPost?.title || '';
      form.elements.category.value = editingPost?.category || 'portadas';
      form.elements.description.value = editingPost?.description || '';
      form.elements.sketchfab.value = (editingPost?.sketchfabModels || []).map(model => model.url || `https://sketchfab.com/models/${model.id}/embed`).join('\n');
      refreshMediaList();
      modal.querySelector('#inline-gallery-post-title').textContent = editingPost ? 'Editar publicación' : 'Nueva publicación';
      modal.querySelector('[data-post-save]').textContent = editingPost ? 'Guardar cambios' : 'Crear publicación';
      modal.querySelector('[data-media-hint]').textContent = editingPost ? 'Quitá archivos con ×, agregá otros o dejá todo como está.' : 'Podés agregar hasta 20 imágenes o videos. Se mostrarán juntos en la publicación.';
      modal.querySelector('[data-post-delete]').hidden = !editingPost;
      modal.hidden = false;
      postStatus.textContent = '';
      modal.querySelector('[name="title"]').focus();
    };
    const closePostModal = () => { modal.hidden = true; editingPost = null; form.reset(); };
    const deletePost = async post => {
      if (post.id) return postApi(`admin/portfolio/${encodeURIComponent(post.id)}`, { method: 'DELETE' });
      if (post.sourceKey) return postApi('admin/portfolio', { method: 'POST', body: JSON.stringify({ sourceKey: post.sourceKey, deleted: true }) });
      throw Error('No se pudo identificar esta publicación.');
    };
    const createAddCard = () => {
      if (!grid || !document.body.classList.contains('inline-editor-active') || grid.querySelector('.inline-editor-gallery-add')) return;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'gallery-card inline-editor-gallery-add';
      card.setAttribute('aria-label', 'Crear una nueva publicación');
      card.innerHTML = '<span class="inline-gallery-plus-art" aria-hidden="true">＋</span>';
      card.addEventListener('click', () => openPost(null));
      grid.append(card);
    };
    const setCardTools = () => {
      if (!grid) return;
      if (!document.body.classList.contains('inline-editor-active')) {
        grid.querySelectorAll('.inline-gallery-card-tools').forEach(node => node.remove());
        grid.querySelectorAll('.inline-editor-gallery-add').forEach(node => node.remove());
        return;
      }
      createAddCard();
      for (const card of grid.querySelectorAll('.gallery-card[data-portfolio-project-key]')) {
        if (card.querySelector('.inline-gallery-card-tools')) continue;
        const tools = document.createElement('span');
        tools.className = 'inline-gallery-card-tools';
        const edit = document.createElement('span');
        edit.setAttribute('role', 'button'); edit.tabIndex = 0; edit.textContent = '✎'; edit.title = 'Editar publicación'; edit.dataset.galleryAction = 'edit';
        const remove = document.createElement('span');
        remove.setAttribute('role', 'button'); remove.tabIndex = 0; remove.textContent = '×'; remove.title = 'Borrar publicación'; remove.dataset.galleryAction = 'delete';
        tools.append(edit, remove);
        card.append(tools);
      }
    };
    const syncDetailTools = () => {
      galleryInfo?.querySelector('.inline-gallery-detail-tools')?.remove();
      galleryInfo?.querySelector('.inline-gallery-organizer')?.remove();
      if (!document.body.classList.contains('inline-editor-active') || !activeProject || galleryModal?.hidden || !galleryInfo) return;
      const tools = document.createElement('div');
      tools.className = 'inline-gallery-detail-tools';
      const organize = document.createElement('button'); organize.type = 'button'; organize.dataset.galleryAction = 'organize-detail'; organize.className = 'inline-gallery-organize-button'; organize.textContent = '✎'; organize.title = 'Ordenar categorías y piezas'; organize.setAttribute('aria-label', 'Ordenar categorías y piezas');
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'inline-gallery-edit-button'; edit.dataset.galleryAction = 'edit-detail'; edit.textContent = 'Editar publicación';
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'inline-gallery-delete-button'; remove.dataset.galleryAction = 'delete-detail'; remove.textContent = 'Borrar publicación';
      tools.append(organize, edit, remove);
      galleryInfo.append(tools);
    };
    const entryKey = entry => entry.type === 'model'
      ? `model:${entry.value.id}`
      : `asset:${new URL(entry.value.src, location.href).pathname}`;
    const renderOrganizer = panel => {
      panel.replaceChildren();
      const heading = document.createElement('div'); heading.className = 'inline-gallery-organizer-heading';
      const title = document.createElement('strong'); title.textContent = 'Ordenar contenido';
      const add = document.createElement('button'); add.type = 'button'; add.textContent = '+ Categoría';
      add.addEventListener('click', () => {
        const name = window.prompt('Nombre de la nueva categoría:')?.trim();
        if (!name || organizerGroups.some(group => group.name.toLowerCase() === name.toLowerCase())) return;
        organizerGroups.push({ name, entries: [] }); renderOrganizer(panel);
      });
      heading.append(title, add); panel.append(heading);
      for (const group of organizerGroups) {
        const section = document.createElement('section'); section.className = 'inline-gallery-organizer-group';
        const name = document.createElement('input'); name.type = 'text'; name.maxLength = 80; name.value = group.name; name.setAttribute('aria-label', 'Nombre de la categoría');
        name.addEventListener('input', () => {
          group.name = name.value;
          panel.querySelectorAll('.inline-gallery-organizer-row select').forEach(select => {
            const selectedGroup = organizerGroups[Number(select.dataset.groupIndex)];
            [...select.options].forEach((option, index) => { option.value = organizerGroups[index]?.name || ''; option.textContent = organizerGroups[index]?.name || 'Categoría sin nombre'; });
            if (selectedGroup) select.value = selectedGroup.name;
          });
        });
        const removeGroup = document.createElement('button'); removeGroup.type = 'button'; removeGroup.textContent = '×'; removeGroup.title = 'Quitar categoría vacía'; removeGroup.disabled = group.entries.length > 0;
        removeGroup.addEventListener('click', () => { if (!group.entries.length) { organizerGroups = organizerGroups.filter(item => item !== group); renderOrganizer(panel); } });
        const groupHead = document.createElement('div'); groupHead.className = 'inline-gallery-organizer-group-heading'; groupHead.append(name, removeGroup); section.append(groupHead);
        group.entries.forEach((entry, index) => {
          const row = document.createElement('div'); row.className = 'inline-gallery-organizer-row';
          const label = document.createElement('span'); label.textContent = entry.type === 'model' ? (entry.value.title || 'Modelo 3D') : (entry.value.title || entry.value.src.split('/').pop()); label.title = label.textContent;
          const select = document.createElement('select'); select.dataset.groupIndex = String(organizerGroups.indexOf(group)); select.setAttribute('aria-label', `Categoría de ${label.textContent}`);
          organizerGroups.forEach(target => { const option = document.createElement('option'); option.value = target.name; option.textContent = target.name || 'Categoría sin nombre'; option.selected = target === group; select.append(option); });
          select.addEventListener('change', () => { const destination = organizerGroups.find(item => item.name === select.value); if (destination && destination !== group) { group.entries.splice(index, 1); destination.entries.push(entry); renderOrganizer(panel); } });
          const up = document.createElement('button'); up.type = 'button'; up.textContent = '↑'; up.title = 'Subir'; up.disabled = index === 0;
          up.addEventListener('click', () => { [group.entries[index - 1], group.entries[index]] = [group.entries[index], group.entries[index - 1]]; renderOrganizer(panel); });
          const down = document.createElement('button'); down.type = 'button'; down.textContent = '↓'; down.title = 'Bajar'; down.disabled = index === group.entries.length - 1;
          down.addEventListener('click', () => { [group.entries[index + 1], group.entries[index]] = [group.entries[index], group.entries[index + 1]]; renderOrganizer(panel); });
          row.append(label, select, up, down); section.append(row);
        });
        panel.append(section);
      }
      const statusLine = document.createElement('p'); statusLine.className = 'inline-gallery-organizer-status'; statusLine.setAttribute('role', 'status'); panel.append(statusLine);
      const save = document.createElement('button'); save.type = 'button'; save.className = 'inline-gallery-organizer-save'; save.textContent = 'Guardar organización';
      save.addEventListener('click', async () => {
        const names = organizerGroups.map(group => group.name.trim());
        if (names.some(name => !name) || new Set(names.map(name => name.toLowerCase())).size !== names.length) { statusLine.textContent = 'Poné un nombre distinto en cada categoría.'; return; }
        save.disabled = true; statusLine.textContent = 'Guardando…';
        const organization = { groups: organizerGroups.map(group => ({ name: group.name.trim(), items: group.entries.map(entryKey) })) };
        try {
          const post = postFromProject(activeProject);
          if (post.id) await postApi(`admin/portfolio/${encodeURIComponent(post.id)}/organization`, { method: 'PATCH', body: JSON.stringify({ organization }) });
          else {
            const payload = { title: post.title, category: post.category, description: post.description, mediaUrls: post.mediaUrls, sketchfabUrls: post.sketchfabModels.map(model => model.url || model.id), sourceKey: post.sourceKey, isPublished: true, organization };
            await postApi('admin/portfolio', { method: 'POST', body: JSON.stringify(payload) });
          }
          activeProject.organization = organization;
          activeProject.displayGroups = organizerGroups.map(group => ({ name: group.name.trim(), entries: group.entries }));
          statusLine.textContent = 'Organización guardada.';
          setTimeout(() => location.reload(), 500);
        } catch (error) { statusLine.textContent = error.message; save.disabled = false; }
      });
      panel.append(save);
    };
    const openOrganizer = () => {
      if (!activeProject || !galleryInfo) return;
      galleryInfo.querySelector('.inline-gallery-organizer')?.remove();
      organizerGroups = (activeProject.displayGroups || []).map(group => ({ name: group.name, entries: [...group.entries] }));
      if (!organizerGroups.length) organizerGroups = [{ name: 'Contenido', entries: [...(activeProject.items || []).map(value => ({ type: 'item', value }))] }];
      const panel = document.createElement('section'); panel.className = 'inline-gallery-organizer';
      galleryInfo.append(panel); renderOrganizer(panel);
    };
    const observer = grid ? new MutationObserver(setCardTools) : null;
    if (grid && observer) observer.observe(grid, { childList: true });
    toggle.addEventListener('click', () => {
      if (toolbar.hidden) { observer?.disconnect(); setCardTools(); if (grid) observer?.observe(grid, { childList: true }); }
      else setCardTools();
      syncDetailTools();
    });
    document.addEventListener('gallery:project-open', event => { activeProject = event.detail; syncDetailTools(); });
    document.addEventListener('gallery:project-close', () => { activeProject = null; syncDetailTools(); });
    document.addEventListener('site-editor-mode-change', syncDetailTools);
    document.addEventListener('click', async event => {
      const action = event.target.closest('[data-gallery-action]')?.dataset.galleryAction;
      if (!action) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      const card = event.target.closest('.gallery-card[data-portfolio-project-key]');
      const post = card ? postFromCard(card) : postFromProject(activeProject);
      if (action === 'edit' && card) openPost(post);
      if (action === 'edit-detail' && activeProject) openPost(post);
      if (action === 'organize-detail' && activeProject) openOrganizer();
      if ((action === 'delete' && card || action === 'delete-detail' && activeProject) && window.confirm(`¿Borrar “${post.title || 'esta publicación'}” del portfolio?`)) {
        try { await deletePost(post); location.reload(); }
        catch (error) { status.textContent = error.message; }
      }
    }, true);
    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.closest('[data-post-close],[data-post-cancel]')) closePostModal();
      if (event.target.closest('[data-post-delete]') && editingPost && window.confirm(`¿Borrar “${editingPost.title}” del portfolio?`)) {
        deletePost(editingPost).then(() => location.reload()).catch(error => { postStatus.textContent = error.message; });
      }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = modal.querySelector('[data-post-save]');
      button.disabled = true;
      postStatus.textContent = 'Subiendo archivos…';
      try {
        const files = [...form.elements.media.files];
        let mediaUrls = editingPost ? [...editingPost.mediaUrls] : [];
        for (const file of files) {
          const data = new FormData(); data.set('file', file);
          const uploaded = await postApi('media/upload', { method: 'POST', body: data });
          mediaUrls.push(uploaded.url);
        }
        if (!mediaUrls.length) throw Error('La publicación necesita al menos una imagen o un video.');
        if (mediaUrls.length > 20) throw Error('Una publicación puede tener hasta 20 archivos.');
        const payload = { title: form.elements.title.value.trim(), category: form.elements.category.value, description: form.elements.description.value.trim(), mediaUrls, sketchfabUrls: form.elements.sketchfab.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean), isPublished: true };
        if (editingPost?.sourceKey && !editingPost.id) payload.sourceKey = editingPost.sourceKey;
        postStatus.textContent = 'Guardando publicación…';
        if (editingPost?.id) await postApi(`admin/portfolio/${encodeURIComponent(editingPost.id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await postApi('admin/portfolio', { method: 'POST', body: JSON.stringify(payload) });
        postStatus.textContent = 'Publicación guardada.';
        setTimeout(() => location.reload(), 450);
      } catch (error) { postStatus.textContent = error.message; button.disabled = false; }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) closePostModal();
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-gallery-action]')) { event.preventDefault(); event.target.click(); }
    });
  }
  void (async () => { try { const result = await api(); state = result.state; prepareNodes(); applyState(); updateHistoryButtons(); } catch { /* Las páginas siguen mostrando su contenido original si el historial no está disponible. */ } })();
})();
