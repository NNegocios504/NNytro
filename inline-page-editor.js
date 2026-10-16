(() => {
  const toggle = document.querySelector('.site-editor-toggle');
  if (!toggle) return;
  const page = location.pathname.split('/').pop().replace(/\.html?$/i, '') || 'index';
  const toolbar = document.createElement('aside');
  toolbar.className = 'inline-editor-toolbar';
  toolbar.hidden = true;
  toolbar.setAttribute('aria-label', 'Editor visual de página');
  toolbar.innerHTML = '<div class="inline-editor-top"><strong>NNYTRO / EDICIÓN</strong><small data-backup-count>0 respaldos</small><button type="button" data-action="undo" aria-label="Deshacer" title="Deshacer">↶</button><button type="button" data-action="redo" aria-label="Rehacer" title="Rehacer">↷</button><button type="button" data-action="close" aria-label="Cerrar editor" title="Cerrar">×</button></div><p class="inline-editor-hint">Hacé clic en un texto o imagen para editarlo. Los cambios se guardan solos.</p><label class="inline-editor-text-field">Texto<textarea rows="2" maxlength="3000" data-field="text" disabled></textarea></label><div class="inline-editor-style"><label>Fuente<select data-field="font" disabled><option value="Crosner">Crosner</option><option value="Comico">Comico</option></select></label><label>Tamaño<input data-field="size" type="number" min="8" max="160" disabled /></label><label>Color<input data-field="color" type="color" value="#ffffff" disabled /></label></div><div class="inline-editor-actions"><button type="button" data-action="image" disabled>Cambiar imagen</button><button type="button" data-action="add-text" disabled>＋ Texto</button><button type="button" data-action="add-image" disabled>＋ Imagen</button><input type="file" data-field="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden /></div><p class="inline-editor-status" role="status" aria-live="polite"></p>';
  document.body.append(toolbar);
  const status = toolbar.querySelector('.inline-editor-status');
  const textField = toolbar.querySelector('[data-field="text"]');
  const fontField = toolbar.querySelector('[data-field="font"]');
  const sizeField = toolbar.querySelector('[data-field="size"]');
  const colorField = toolbar.querySelector('[data-field="color"]');
  const fileField = toolbar.querySelector('[data-field="file"]');
  let selected = null;
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
    const active = !toolbar.hidden;
    toolbar.hidden = active;
    document.body.classList.toggle('inline-editor-active', !active);
    toggle.setAttribute('aria-pressed', String(!active));
    if (active) { selected?.classList.remove('inline-editor-selected'); selected?.removeAttribute('contenteditable'); selected = null; return; }
    prepareNodes(); applyState(); updateHistoryButtons(); status.textContent = 'Modo edición activo.';
  });
  toolbar.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') toggle.click();
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
    const add = document.createElement('a'); add.className = 'inline-editor-gallery-add'; add.href = './admin-portfolio.html#new-publication'; add.textContent = '+ Publicación'; add.hidden = true; add.setAttribute('aria-label', 'Crear una publicación nueva en el portfolio'); document.body.append(add);
    toggle.addEventListener('click', () => { add.hidden = toolbar.hidden; });
  }
  void (async () => { try { const result = await api(); state = result.state; prepareNodes(); applyState(); updateHistoryButtons(); } catch { /* Las páginas siguen mostrando su contenido original si el historial no está disponible. */ } })();
})();
