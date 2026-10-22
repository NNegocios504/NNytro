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
      toolbar.hidden = page === 'galeria';
      document.body.classList.add('inline-editor-active');
      toggle.setAttribute('aria-pressed', 'true');
      document.dispatchEvent(new CustomEvent('site-editor-mode-change', { detail: { active: true } }));
      prepareNodes(); applyState(); updateHistoryButtons(); status.textContent = 'Modo edición activo.';
      return;
    }
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
    if (action === 'close') toggle.click();
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
    modal.innerHTML = '<form class="inline-gallery-post-form"><div class="inline-gallery-post-heading"><div><small>NNYTRO / PORTFOLIO</small><h2 id="inline-gallery-post-title">Nueva publicación</h2></div><button type="button" data-post-close aria-label="Cerrar">×</button></div><label>Título<input name="title" maxlength="120" required placeholder="Nombre de la publicación"></label><label>Categoría<select name="category" required><option value="portadas">Portadas</option><option value="menus">Menús</option><option value="renders">Renders</option><option value="dibujos">Dibujos</option><option value="modeloss blockbench">Modelos Blockbench</option><option value="matt">Matt</option><option value="skins">Skins</option><option value="under news">Under News</option></select></label><label>Descripción<textarea name="description" maxlength="1200" rows="3" placeholder="Opcional"></textarea></label><label>Visores 3D de Sketchfab (opcional)<textarea name="sketchfab" maxlength="2400" rows="3" placeholder="Pegá un enlace por línea"></textarea></label><small class="inline-gallery-media-hint">Podés agregar varios modelos, uno por línea. Si tienen animaciones, se pueden controlar desde el visor. Borrá los enlaces para quitarlos.</small><section class="inline-gallery-current-media" data-media-list aria-label="Archivos de la publicación"></section><label>Agregar imágenes o videos<input name="media" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple></label><small class="inline-gallery-media-hint" data-media-hint>Podés agregar hasta 100 archivos JPG, PNG, WEBP, GIF, MP4 o WEBM de hasta 24 MB cada uno.</small><p class="inline-gallery-post-status" role="status" aria-live="polite"></p><div class="inline-gallery-post-actions"><button type="button" class="inline-gallery-delete" data-post-delete hidden>Borrar publicación</button><span></span><button type="button" data-post-cancel>Cancelar</button><button type="submit" data-post-save>Crear publicación</button></div></form>';
    document.body.append(modal);
    const form = modal.querySelector('form');
    const postStatus = modal.querySelector('.inline-gallery-post-status');
    const mediaList = modal.querySelector('[data-media-list]');
    let editingPost = null;
    let activeProject = null;
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
        item.draggable = true;
        item.title = 'Arrastrá para cambiar el orden';
        item.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move'; });
        item.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; });
        item.addEventListener('drop', event => {
          event.preventDefault();
          const from = Number(event.dataTransfer.getData('text/plain'));
          if (!Number.isInteger(from) || from < 0 || from >= mediaUrls.length || from === index) return;
          mediaUrls.splice(index, 0, mediaUrls.splice(from, 1)[0]); refreshMediaList();
        });
        const replace = document.createElement('button'); replace.type = 'button'; replace.className = 'inline-gallery-media-replace'; replace.textContent = '✎'; replace.setAttribute('aria-label', 'Reemplazar archivo ' + (index + 1));
        replace.addEventListener('click', () => {
          const input = document.createElement('input'); input.type = 'file'; input.accept = form.elements.media.accept;
          input.addEventListener('change', async () => {
            if (!input.files[0]) return;
            replace.disabled = true; postStatus.textContent = 'Subiendo reemplazo…';
            try { const oldUrl = mediaUrls[index]; mediaUrls[index] = await upload(input.files[0]); editingPost.replacements[new URL(oldUrl, location.href).pathname] = new URL(mediaUrls[index], location.href).pathname; refreshMediaList(); postStatus.textContent = 'Reemplazo listo. Guardá los cambios.'; }
            catch (error) { postStatus.textContent = error.message; replace.disabled = false; }
          }); input.click();
        });
        const move = direction => { const target = index + direction; if (target < 0 || target >= mediaUrls.length) return; [mediaUrls[index], mediaUrls[target]] = [mediaUrls[target], mediaUrls[index]]; refreshMediaList(); };
        const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'inline-gallery-media-previous'; previous.textContent = '←'; previous.setAttribute('aria-label', 'Mover archivo antes'); previous.disabled = index === 0; previous.onclick = () => move(-1);
        const next = document.createElement('button'); next.type = 'button'; next.className = 'inline-gallery-media-next'; next.textContent = '→'; next.setAttribute('aria-label', 'Mover archivo después'); next.disabled = index === mediaUrls.length - 1; next.onclick = () => move(1);
        item.append(preview, remove, replace, previous, next);
        mediaList.append(item);
      });
    };
    const openPost = post => {
      const embedded = false;
      modal.classList.toggle('is-embedded', embedded);
      if (embedded) galleryInfo.append(modal);
      else document.body.append(modal);
      editingPost = post ? { ...post, mediaUrls: [...post.mediaUrls], originalMediaUrls: [...post.mediaUrls], replacements: {} } : null;
      form.reset();
      form.elements.title.value = editingPost?.title || '';
      form.elements.category.value = editingPost?.category || 'portadas';
      form.elements.description.value = editingPost?.description || '';
      form.elements.sketchfab.value = (editingPost?.sketchfabModels || []).map(model => model.url || `https://sketchfab.com/models/${model.id}/embed`).join('\n');
      refreshMediaList();
      modal.querySelector('#inline-gallery-post-title').textContent = editingPost ? 'Editar publicación' : 'Nueva publicación';
      modal.querySelector('[data-post-save]').textContent = editingPost ? 'Guardar cambios' : 'Crear publicación';
      modal.querySelector('[data-media-hint]').textContent = editingPost ? 'Arrastrá para ordenar, usá ✎ para reemplazar y × para quitar. Guardá para aplicar los cambios.' : 'Podés agregar hasta 100 imágenes o videos. Se mostrarán juntos en la publicación.';
      modal.querySelector('[data-post-delete]').hidden = !editingPost;
      modal.hidden = false;
      postStatus.textContent = '';
      modal.querySelector('[name="title"]').focus();
    };
    const closePostModal = () => { modal.hidden = true; modal.classList.remove('is-embedded'); document.body.append(modal); editingPost = null; form.reset(); };
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
    let directDraft = null;
    let originalMedia = [];
    let draggedEntry = null;
    const mediaArea = galleryModal?.querySelector('.gallery-modal-media');
    const entryKey = entry => entry.type === 'model' ? 'model:' + entry.value.id : 'asset:' + new URL(entry.value.src, location.href).pathname;
    const stopDirectEdit = () => {
      if (!directDraft) return;
      mediaArea.replaceChildren(...originalMedia);
      mediaArea.classList.remove('is-direct-editing');
      galleryInfo.querySelectorAll('[contenteditable]').forEach(node => { node.removeAttribute('contenteditable'); });
      galleryInfo.querySelector('h2').textContent = activeProject.title;
      const description = galleryInfo.querySelector('.gallery-modal-description');
      description.textContent = activeProject.description || ''; description.hidden = !activeProject.description;
      directDraft = null;
    };
    const renderDirectMedia = () => {
      mediaArea.replaceChildren();
      directDraft.groups.forEach(group => {
        const section = document.createElement('section'); section.className = 'direct-edit-group';
        const heading = document.createElement('h3'); heading.className = 'gallery-collection-heading'; heading.textContent = group.name;
        const grid = document.createElement('div'); grid.className = 'direct-edit-grid';
        const drop = (event, before = null) => {
          event.preventDefault(); event.stopPropagation(); if (!draggedEntry || draggedEntry === before) return;
          directDraft.groups.forEach(g => { g.entries = g.entries.filter(entry => entry !== draggedEntry); });
          const index = before ? group.entries.indexOf(before) : group.entries.length;
          group.entries.splice(index < 0 ? group.entries.length : index, 0, draggedEntry); draggedEntry = null; renderDirectMedia();
        };
        section.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; });
        section.addEventListener('drop', event => drop(event));
        group.entries.forEach(entry => {
          const piece = document.createElement('figure'); piece.className = 'gallery-modal-piece direct-edit-piece'; piece.draggable = true;
          piece.addEventListener('dragstart', event => { draggedEntry = entry; event.dataTransfer.setData('text/plain', entryKey(entry)); event.dataTransfer.effectAllowed = 'move'; piece.classList.add('is-dragging'); });
          piece.addEventListener('dragend', () => { draggedEntry = null; piece.classList.remove('is-dragging'); });
          piece.addEventListener('drop', event => drop(event, entry));
          const media = document.createElement(entry.type === 'model' ? 'div' : entry.value.type === 'video' ? 'video' : 'img');
          if (entry.type === 'model') media.textContent = entry.value.title || 'Modelo 3D';
          else { media.src = entry.value.src; media.draggable = false; media.alt = entry.value.title || ''; }
          const caption = document.createElement('figcaption'); caption.textContent = entry.value.title || 'Imagen nueva';
          const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'direct-edit-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Borrar ' + caption.textContent);
          remove.onclick = () => { if (!window.confirm('¿Borrar esta imagen de la publicación? El cambio se aplica al guardar.')) return; group.entries = group.entries.filter(item => item !== entry); renderDirectMedia(); };
          piece.append(media, caption, remove); grid.append(piece);
        });
        if (!group.entries.length) { const hint = document.createElement('p'); hint.className = 'direct-edit-drop-hint'; hint.textContent = 'Arrastrá imágenes acá'; grid.append(hint); }
        section.append(heading, grid); mediaArea.append(section);
      });
    };
    const syncDetailTools = () => {
      stopDirectEdit();
      galleryInfo?.querySelector('.inline-gallery-detail-tools')?.remove();
      if (!document.body.classList.contains('inline-editor-active') || !activeProject || galleryModal?.hidden || !galleryInfo) return;
      const tools = document.createElement('div'); tools.className = 'inline-gallery-detail-tools direct-edit-tools';
      const pencil = document.createElement('button'); pencil.type = 'button'; pencil.className = 'direct-edit-pencil'; pencil.textContent = '✎'; pencil.title = 'Editar esta publicación'; pencil.setAttribute('aria-label', pencil.title); pencil.setAttribute('aria-pressed', 'false');
      tools.append(pencil); galleryInfo.append(tools);
      pencil.onclick = () => {
        if (directDraft) { syncDetailTools(); return; }
        directDraft = { groups: (activeProject.displayGroups || [{ name: 'Contenido', entries: activeProject.items.map(value => ({type:'item', value})) }]).map(group => ({ name: group.name, entries: [...group.entries] })) };
        originalMedia = [...mediaArea.childNodes]; mediaArea.classList.add('is-direct-editing');
        pencil.setAttribute('aria-pressed', 'true');
        const title = galleryInfo.querySelector('h2');
        const description = galleryInfo.querySelector('.gallery-modal-description');
        [title, description].forEach(node => { node.contentEditable = 'true'; node.setAttribute('role', 'textbox'); }); description.hidden = false;
        const controls = document.createElement('div'); controls.className = 'direct-edit-controls';
        const hint = document.createElement('p'); hint.textContent = 'Editá el título y la descripción arriba. Arrastrá las imágenes para ordenarlas o moverlas a otra categoría.';
        const categories = document.createElement('div'); categories.className = 'direct-edit-categories';
        const renderCategories = () => {
          categories.replaceChildren();
          directDraft.groups.forEach(group => {
            const row = document.createElement('div');
            const name = document.createElement('input'); name.value = group.name; name.maxLength = 80; name.setAttribute('aria-label', 'Nombre de categoría');
            name.oninput = () => { group.name = name.value; renderDirectMedia(); };
            const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.title = 'Sacar categoría'; remove.onclick = () => {
              if (directDraft.groups.length === 1) { message.textContent = 'Dejá al menos una categoría.'; return; }
              if (!window.confirm('¿Sacar esta categoría? Sus imágenes pasarán a la primera categoría restante.')) return;
              directDraft.groups = directDraft.groups.filter(item => item !== group); directDraft.groups[0].entries.push(...group.entries); renderCategories(); renderDirectMedia();
            }; row.append(name, remove); categories.append(row);
          });
        };
        const addCategory = document.createElement('button'); addCategory.type = 'button'; addCategory.textContent = '+ Categoría'; addCategory.onclick = () => { directDraft.groups.push({ name: 'Nueva categoría', entries: [] }); renderCategories(); renderDirectMedia(); categories.lastChild.querySelector('input').focus(); };
        const uploadTarget = document.createElement('select'); uploadTarget.setAttribute('aria-label', 'Categoría para las imágenes nuevas');
        const updateTargets = () => { const previous = uploadTarget.value; uploadTarget.replaceChildren(); directDraft.groups.forEach((g,index) => { const option = document.createElement('option'); option.value = index; option.textContent = g.name; uploadTarget.append(option); }); uploadTarget.value = previous || '0'; };
        categories.addEventListener('input', updateTargets); categories.addEventListener('click', () => queueMicrotask(updateTargets)); addCategory.addEventListener('click', updateTargets);
        const files = document.createElement('input'); files.type = 'file'; files.multiple = true; files.accept = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'; files.hidden = true;
        const addImages = document.createElement('button'); addImages.type = 'button'; addImages.textContent = '+ Imágenes'; addImages.onclick = () => files.click();
        files.onchange = async () => {
          const target = directDraft.groups[Number(uploadTarget.value)] || directDraft.groups[0]; addImages.disabled = true; save.disabled = true;
          try { for (const file of files.files) { message.textContent = 'Subiendo ' + file.name + '…'; const src = await upload(file); target.entries.push({ type:'item', value:{ src, title:file.name.replace(/\.[^.]+$/, ''), type:file.type.startsWith('video/') ? 'video' : 'image' } }); } renderDirectMedia(); message.textContent = 'Imágenes listas. Guardá los cambios.'; }
          catch(error) { message.textContent = error.message; }
          finally { addImages.disabled = false; save.disabled = false; files.value = ''; }
        };
        const message = document.createElement('p'); message.className = 'direct-edit-status'; message.setAttribute('role', 'status');
        const save = document.createElement('button'); save.type = 'button'; save.textContent = 'Guardar cambios'; save.className = 'direct-edit-save';
        save.onclick = async () => {
          const names = directDraft.groups.map(g => g.name.trim());
          if (!title.textContent.trim() || title.textContent.trim().length > 120 || description.textContent.length > 1200) { message.textContent = 'Revisá el título (hasta 120 caracteres) y la descripción (hasta 1200).'; return; }
          if (names.some(name => !name) || new Set(names.map(n => n.toLowerCase())).size !== names.length) { message.textContent = 'Usá nombres distintos y completos para las categorías.'; return; }
          const entries = directDraft.groups.flatMap(g => g.entries); const mediaUrls = entries.filter(e => e.type !== 'model').map(e => e.value.src);
          if (!mediaUrls.length) { message.textContent = 'Dejá al menos una imagen o video.'; return; }
          const post = postFromProject(activeProject);
          const payload = { title:title.textContent.trim(), description:description.textContent.trim(), category:post.category, mediaUrls, sketchfabUrls:entries.filter(e => e.type === 'model').map(e => e.value.url || e.value.id), organization:{ groups:directDraft.groups.map(g => ({ name:g.name.trim(), items:g.entries.map(entryKey) })) }, isPublished:true };
          if (!post.id) payload.sourceKey = post.sourceKey;
          save.disabled = true; message.textContent = 'Guardando…';
          try { await postApi(post.id ? 'admin/portfolio/' + encodeURIComponent(post.id) : 'admin/portfolio', {method:post.id ? 'PATCH':'POST',body:JSON.stringify(payload)}); location.reload(); }
          catch(error) { message.textContent = error.message; save.disabled = false; }
        };
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancelar'; cancel.onclick = syncDetailTools;
        controls.append(hint,categories,addCategory,uploadTarget,addImages,files,message,save,cancel); tools.append(controls);
        renderCategories(); updateTargets(); renderDirectMedia();
      };
    };
    const observer = grid ? new MutationObserver(setCardTools) : null;
    if (grid && observer) observer.observe(grid, { childList: true });
    toggle.addEventListener('click', () => {
      if (toolbar.hidden) { observer?.disconnect(); setCardTools(); if (grid) observer?.observe(grid, { childList: true }); }
      else setCardTools();
      syncDetailTools();
    });
    document.addEventListener('gallery:project-open', event => { stopDirectEdit(); activeProject = event.detail; syncDetailTools(); });
    document.addEventListener('gallery:project-close', () => { stopDirectEdit(); activeProject = null; syncDetailTools(); });
    document.addEventListener('site-editor-mode-change', syncDetailTools);
    document.addEventListener('click', async event => {
      const action = event.target.closest('[data-gallery-action]')?.dataset.galleryAction;
      if (!action) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      const card = event.target.closest('.gallery-card[data-portfolio-project-key]');
      const post = card ? postFromCard(card) : postFromProject(activeProject);
      if (action === 'edit' && card) { card.click(); galleryInfo.querySelector('.direct-edit-pencil')?.click(); }


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
        if (mediaUrls.length > 100) throw Error('Una publicación puede tener hasta 100 archivos.');
        const payload = { title: form.elements.title.value.trim(), category: form.elements.category.value, description: form.elements.description.value.trim(), mediaUrls, sketchfabUrls: form.elements.sketchfab.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean), isPublished: true };
        if (editingPost && activeProject?.organization?.groups) {
          const keys = mediaUrls.map(url => 'asset:' + new URL(url, location.href).pathname);
          payload.organization = { groups: activeProject.organization.groups.map(group => ({ name: group.name, items: group.items.map(key => {
            let path = key.startsWith('asset:') ? key.slice(6) : '';
            const seen = new Set();
            while (editingPost.replacements[path] && !seen.has(path)) { seen.add(path); path = editingPost.replacements[path]; }
            return path ? 'asset:' + path : key;
          }).filter(key => !key.startsWith('asset:') || keys.includes(key)).sort((a, b) => keys.indexOf(a) - keys.indexOf(b)) })) };
        }
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
