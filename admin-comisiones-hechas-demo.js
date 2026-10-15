(() => {
  const KEY = 'nnytro-completed-commissions-demo-v1';
  const form = document.querySelector('#publish-form');
  const list = document.querySelector('#published-list');
  const read = () => { try { const data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } };
  const write = data => { localStorage.setItem(KEY, JSON.stringify(data)); render(); };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines = value => value.split(/\r?\n/).map(url => url.trim()).filter(Boolean).map(url => ({url}));
  function render() {
    const data = read();
    list.innerHTML = data.length ? data.slice().reverse().map(item => `<article><div><strong>${esc(item.title)}</strong><p>${esc(item.clientName || 'Sin nombre')} · ${item.published && item.completed && item.paid ? 'Visible en demo' : 'Oculta hasta estar terminada, pagada y publicada'}</p></div><button type="button" data-remove="${esc(item.id)}">Eliminar ficha</button></article>`).join('') : '<p>Aún no hay fichas guardadas en este navegador.</p>';
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const f = new FormData(form);
    if (f.has('published') && (!f.has('completed') || !f.has('paid'))) { document.querySelector('#status').textContent = 'Para publicar, confirmá que esté terminada y completamente pagada.'; return; }
    const data = read();
    data.push({id: `local-${Date.now()}`, title: String(f.get('title')).trim(), clientName: String(f.get('clientName') || '').trim(), category: String(f.get('category') || '').trim(), currency: String(f.get('currency') || 'USD'), brief: String(f.get('brief') || '').trim(), initialQuote: f.get('initialQuote') || null, finalQuote: f.get('finalQuote') || null, priceReason: String(f.get('priceReason') || '').trim(), references: lines(String(f.get('references') || '')), processVideo: String(f.get('processVideo') || '').trim(), finalImages: lines(String(f.get('finalImages') || '')), completed: f.has('completed'), paid: f.has('paid'), published: f.has('published'), completedAt: new Date().toISOString()});
    write(data); form.reset(); document.querySelector('#status').textContent = 'Ficha guardada en el almacenamiento de este navegador.';
  });
  list.addEventListener('click', event => { const button = event.target.closest('[data-remove]'); if (!button) return; write(read().filter(item => item.id !== button.dataset.remove)); });
  render();
})();
