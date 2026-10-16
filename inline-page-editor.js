(() => {
  const toggle = document.querySelector('.site-editor-toggle');
  if (!toggle) return;
  const page = location.pathname.split('/').pop().replace(/\.html?$/i, '') || 'index';
  const toolbar = document.createElement('aside');
  toolbar.className = 'inline-editor-toolbar';
  toolbar.hidden = true;
  toolbar.setAttribute('aria-label', 'Editor visual de página');
  toolbar.innerHTML = '<div class="inline-editor-top"><strong>NNYTRO / EDICIÓN</strong><small data-backup-count>0 respaldos</small><button type="button" data-action="undo" aria-label="Deshacer" title="Deshacer">↶</button><button type="button" data-action="redo" aria-label="Rehacer" title="Rehacer">↷</button><button type="button" data-action="close" aria-label="Cerrar menú de edición" title="Cerrar menú de edición">×</button></div><p class="inline-editor-hint">Hacé clic en un texto o imagen para editarlo. Los cambios se guardan solos.</p><label class="inline-editor-text-field">Texto<textarea rows="2" maxlength="3000" data-field="text" disabled></textarea></label><div class="inline-editor-style"><label>Fuente<select data-field="font" disabled><option value="Crosner">Crosner</option><option value="Comico">Comico</option></select></label><label>Tamaño<input data-field="size" type="number" min="8" max="160" disabled /></label><label>Color<input data-field="color" type="color" value="#ffffff" disabled /></label></div><div class="inline-editor-actions"><button type="button" data-action="image" disabled>Cambiar imagen</button><button type="button" data-action="add-text" disabled>＋ Texto</button><button type="button" data-action="add-image" disabled>＋ Imagen</button><input type="file" data-field="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden /></div><p class="inline-editor-status" role="status" aria-live="polite"></p>';
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
      prepareNodes(); applyState(); updateHistoryButtons(); status.textContent = 'Modo edición activo.';
      return;
    }
    if (toolbar.hidden) { toolbar.hidden = false; return; }
    toolbar.hidden = true;
    editingEnabled = false;
    document.body.classList.remove('inline-editor-active');
    toggle.setAttribute('aria-pressed', 'false');
    selected?.classList.remove('inline-editor-selected');
    selected?.removeAttribute('contenteditable');
    selected = null;
  });
  toolbar.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') toolbar.hidden = true;
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
    const modal = document.createElement('section'); modal.className = 'inline-gallery-post-modal'; modal.hidden = true; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'inline-gallery-post-title');
    modal.innerHTML = '<form class="inline-gallery-post-form"><div class="inline-gallery-post-heading"><div><small>NNYTRO / PORTFOLIO</small><h2 id="inline-gallery-post-title">Nueva publicación</h2></div><button type="button" data-post-close aria-label="Cerrar">×</button></div><label>Título<input name="title" maxlength="120" required placeholder="Nombre de la publicación"></label><label>Categoría<select name="category" required><option value="portadas">Portadas</option><option value="menus">Menús</option><option value="renders">Renders</option><option value="dibujos">Dibujos</option><option value="modeloss blockbench">Modelos Blockbench</option><option value="matt">Matt</option><option value="skins">Skins</option><option value="under news">Under News</option></select></label><label>Descripción<textarea name="description" maxlength="1200" rows="3" placeholder="Opcional"></textarea></label><label>Imágenes o videos<input name="media" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple></label><small class="inline-gallery-media-hint" data-media-hint>Podés agregar hasta 20 archivos. Se mostrarán juntos en la publicación.</small><label class="inline-gallery-replace" data-replace-wrap hidden><input name="replaceMedia" type="checkbox"> Reemplazar los archivos actuales</label><p class="inline-gallery-post-status" role="status" aria-live="polite"></p><div class="inline-gallery-post-actions"><button type="button" class="inline-gallery-delete" data-post-delete hidden>Borrar publicación</button><span></span><button type="button" data-post-cancel>Cancelar</button><button type="submit" data-post-save>Crear publicación</button></div></form>';
    document.body.append(modal);
    const form = modal.querySelector('form'); const postStatus = modal.querySelector('.inline-gallery-post-status'); let editingPost = null;
    const postApi = async (path, options = {}) => { const response = await fetch(`/api/${path}`, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw Error(data.error || `Error del servidor (${response.status})`); return data; };
    const closeModal = () => { modal.hidden = true; editingPost = null; form.reset(); modal.querySelector('[data-replace-wrap]').hidden = true; modal.querySelector('[data-post-delete]').hidden = true; };
    const openPost = (card = null) => { editingPost = card ? { id: card.dataset.adminEntryId, title: card.dataset.adminEntryTitle || '', category: card.dataset.adminEntryCategory || 'portadas', description: card.dataset.adminEntryDescription || '', mediaUrls: JSON.parse(card.dataset.adminEntryMedia || '[]'), isPublished: true } : null; form.reset(); form.elements.title.value = editingPost?.title || ''; form.elements.category.value = editingPost?.category || 'portadas'; form.elements.description.value = editingPost?.description || ''; form.elements.media.required = !editingPost; modal.querySelector('#inline-gallery-post-title').textContent = editingPost ? 'Editar publicación' : 'Nueva publicación'; modal.querySelector('[data-post-save]').textContent = editingPost ? 'Guardar cambios' : 'Crear publicación'; modal.querySelector('[data-media-hint]').textContent = editingPost ? `${editingPost.mediaUrls.length} archivos actuales. Podés sumar archivos o reemplazarlos.` : 'Podés agregar hasta 20 imágenes o videos. Se mostrarán juntos en la publicación.'; modal.querySelector('[data-replace-wrap]').hidden = !editingPost; modal.querySelector('[data-post-delete]').hidden = !editingPost; modal.hidden = false; postStatus.textContent = ''; modal.querySelector('[name="title"]').focus(); };
    const createAddCard = () => { if (!grid || toolbar.hidden || grid.querySelector('.inline-editor-gallery-add')) return; const card = document.createElement('button'); card.type = 'button'; card.className = 'gallery-card inline-editor-gallery-add'; card.setAttribute('aria-label', 'Crear una nueva publicación'); card.innerHTML = '<span class="inline-gallery-plus-art" aria-hidden="true">＋</span>'; card.addEventListener('click', () => openPost()); grid.append(card); };
    const setCardTools = () => { if (!grid) return; if (toolbar.hidden) { grid.querySelectorAll('.inline-gallery-card-tools').forEach(node => node.remove()); grid.querySelectorAll('.inline-editor-gallery-add').forEach(node => node.remove()); return; } createAddCard(); for (const card of grid.querySelectorAll('.gallery-card[data-admin-entry-id]')) { if (card.querySelector('.inline-gallery-card-tools')) continue; const tools = document.createElement('span'); tools.className = 'inline-gallery-card-tools'; const edit = document.createElement('span'); edit.setAttribute('role', 'button'); edit.tabIndex = 0; edit.textContent = '✎'; edit.title = 'Editar publicación'; edit.dataset.galleryAction = 'edit'; const remove = document.createElement('span'); remove.setAttribute('role', 'button'); remove.tabIndex = 0; remove.textContent = '×'; remove.title = 'Borrar publicación'; remove.dataset.galleryAction = 'delete'; tools.append(edit, remove); card.append(tools); } };
    const observer = grid ? new MutationObserver(setCardTools) : null; if (grid && observer) observer.observe(grid, { childList: true });
    toggle.addEventListener('click', () => { if (toolbar.hidden) { observer?.disconnect(); setCardTools(); if (grid) observer?.observe(grid, { childList: true }); } else setCardTools(); });
    document.addEventListener('click', async event => { const action = event.target.closest('[data-gallery-action]')?.dataset.galleryAction; if (!action) return; event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); const card = event.target.closest('.gallery-card[data-admin-entry-id]'); if (action === 'edit' && card) openPost(card); if (action === 'delete' && card && window.confirm(`¿Borrar “${card.dataset.adminEntryTitle || 'esta publicación'}” del portfolio?`)) { try { await postApi(`admin/portfolio/${encodeURIComponent(card.dataset.adminEntryId)}`, { method: 'DELETE' }); location.reload(); } catch (error) { status.textContent = error.message; } } }, true);
    modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-post-close],[data-post-cancel]')) closeModal(); if (event.target.closest('[data-post-delete]') && editingPost && window.confirm(`¿Borrar “${editingPost.title}” del portfolio?`)) { postApi(`admin/portfolio/${encodeURIComponent(editingPost.id)}`, { method: 'DELETE' }).then(() => location.reload()).catch(error => { postStatus.textContent = error.message; }); } });
    form.addEventListener('submit', async event => { event.preventDefault(); const button = modal.querySelector('[data-post-save]'); button.disabled = true; postStatus.textContent = 'Subiendo archivos…'; try { const files = [...form.elements.media.files]; if (!editingPost && !files.length) throw Error('Elegí al menos una imagen o un video.'); if (editingPost && form.elements.replaceMedia.checked && !files.length) throw Error('Elegí los archivos nuevos para reemplazar los actuales.'); let mediaUrls = editingPost ? [...editingPost.mediaUrls] : []; if (form.elements.replaceMedia.checked) mediaUrls = []; for (const file of files) { const data = new FormData(); data.set('file', file); const uploaded = await postApi('media/upload', { method: 'POST', body: data }); mediaUrls.push(uploaded.url); } if (mediaUrls.length > 20) throw Error('Una publicación puede tener hasta 20 archivos.'); const payload = { title: form.elements.title.value.trim(), category: form.elements.category.value, description: form.elements.description.value.trim(), mediaUrls, isPublished: true }; postStatus.textContent = 'Guardando publicación…'; if (editingPost) await postApi(`admin/portfolio/${encodeURIComponent(editingPost.id)}`, { method: 'PATCH', body: JSON.stringify(payload) }); else await postApi('admin/portfolio', { method: 'POST', body: JSON.stringify(payload) }); postStatus.textContent = 'Listo. Se creó el panel de la publicación.'; setTimeout(() => location.reload(), 450); } catch (error) { postStatus.textContent = error.message; button.disabled = false; } });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-gallery-action]')) { event.preventDefault(); event.target.click(); } });
  }
  void (async () => { try { const result = await api(); state = result.state; prepareNodes(); applyState(); updateHistoryButtons(); } catch { /* Las páginas siguen mostrando su contenido original si el historial no está disponible. */ } })();
})();
