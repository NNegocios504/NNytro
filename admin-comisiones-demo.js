(() => {
  const KEY = 'nnytro-commission-orders-demo-v1';
  const root = document.querySelector('#admin-orders-list');
  let activeFilter = 'all';
  const money = (amount, currency) => `${currency || ''} ${Number(amount || 0).toFixed(2)}`.trim();
  const getOrders = () => { try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  const setOrders = orders => { localStorage.setItem(KEY, JSON.stringify(orders)); window.dispatchEvent(new StorageEvent('storage', { key: KEY })); render(); };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const statuses = { requested: 'Esperando revisión', rejected: 'Rechazado', accepted: 'Aceptado · cotizar', quoted: 'Cotización preparada', awaiting_full_payment: 'Esperando pago completo', awaiting_advance: 'Esperando adelanto', in_progress: 'En curso · anticipo marcado', awaiting_balance: 'Saldo pendiente', paid: 'Pago marcado completo' };
  function render() {
    const orders = getOrders();
    if (!orders.length) { root.innerHTML = '<div class="admin-demo-empty"><span>◎</span><h3>No hay pedidos todavía</h3><p>Agregá servicios al carrito en la página de comisiones y creá un pedido de prueba para verlo acá.</p><a class="commission-primary" href="./comisiones.html#opciones">Ir al catálogo ↗</a></div>'; return; }
    const visibleOrders = orders.filter(order => activeFilter === 'all' || activeFilter === 'pending' && order.status === 'requested' || activeFilter === 'accepted' && ['accepted','quoted','in_progress'].includes(order.status) || activeFilter === 'payment' && ['awaiting_full_payment','awaiting_advance','awaiting_balance'].includes(order.status) || activeFilter === 'closed' && ['rejected','paid'].includes(order.status));
    if (!visibleOrders.length) { root.innerHTML = '<div class="admin-demo-empty"><h3>No hay pedidos en este filtro</h3><p>Probá con otra categoría.</p></div>'; return; }
    root.innerHTML = visibleOrders.slice().reverse().map(order => {
      const items = (order.items || []).map(item => `<li><span>${esc(item.name)}</span><b>× ${Number(item.quantity) || 1}</b></li>`).join('');
      const date = order.createdAt ? new Date(order.createdAt).toLocaleString('es-AR') : 'Fecha no disponible';
      const total = order.total !== null && order.total !== '' && Number.isFinite(Number(order.total)) ? order.total : '';
      const paymentPlan = order.paymentPlan || '';
      const deposit = total === '' ? 0 : Math.round(Number(total) * 0.5 * 100) / 100;
      const breakdown = total !== '' && paymentPlan === 'deposit_50' ? `<p class="admin-payment-breakdown">Adelanto sugerido: <strong>${esc(money(deposit, order.currency))}</strong> · Saldo: <strong>${esc(money(Number(total) - deposit, order.currency))}</strong></p>` : '';
      const actions = order.status === 'awaiting_advance' ? '<button data-action="advance">Marcar adelanto recibido</button>' : order.status === 'in_progress' ? '<button data-action="balance">Trabajo terminado · pedir saldo</button>' : ['awaiting_full_payment', 'awaiting_balance'].includes(order.status) ? '<button data-action="paid">Marcar pago recibido</button>' : '';
      return `<article class="admin-order-card" data-id="${esc(order.id)}"><header><div><p class="commission-eyebrow">${esc(order.id)} · ${esc(date)}</p><h3>${esc(statuses[order.status] || 'Pedido')}</h3></div><span class="admin-status-dot" aria-hidden="true"></span></header><ul class="admin-order-items">${items}</ul><p class="admin-client-contact"><strong>Contacto:</strong> ${esc(order.clientContact || 'No indicado')}</p><p class="admin-client-contact"><strong>Idea:</strong> ${esc(order.details || 'Sin detalles adicionales')}</p><label class="admin-spoke-label"><input type="checkbox" data-field="spoke" ${order.spokeConfirmed ? 'checked' : ''}/> Confirmé que ya hablamos</label><label class="admin-label">Estado de revisión<select data-field="review"><option value="requested" ${order.status === 'requested' ? 'selected' : ''}>Pendiente de revisar</option><option value="accepted" ${order.status === 'accepted' || order.status === 'quoted' || (order.status || '').startsWith('awaiting_') || order.status === 'in_progress' || order.status === 'paid' ? 'selected' : ''}>Aceptar pedido</option><option value="rejected" ${order.status === 'rejected' ? 'selected' : ''}>Rechazar pedido</option></select></label><div class="admin-quote-grid"><label class="admin-label">Precio total<input type="number" min="0" step="0.01" data-field="total" value="${esc(total)}" placeholder="A definir" /></label><label class="admin-label">Moneda final<strong>USD</strong><input type="hidden" data-field="currency" value="USD"></label><label class="admin-label">Forma de pago<select data-field="plan"><option value="" ${!paymentPlan ? 'selected' : ''}>Elegir modalidad</option><option value="full" ${paymentPlan === 'full' ? 'selected' : ''}>Completo</option><option value="deposit_50" ${paymentPlan === 'deposit_50' ? 'selected' : ''}>50% adelanto + 50% saldo</option></select></label></div>${breakdown}<label class="admin-label">Link de pago (manual)<input type="url" data-field="url" value="${esc(order.paymentUrl || '')}" placeholder="https://…" /></label><div class="admin-order-actions"><button class="admin-save-quote" data-action="save">Guardar cambios</button><button class="admin-reject-order" data-action="reject">Rechazar</button>${actions}</div><p class="admin-save-status" role="status"></p></article>`;
    }).join('');
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const card = button.closest('.admin-order-card'); const orders = getOrders(); const order = orders.find(item => item.id === card.dataset.id); if (!order) return;
    const action = button.dataset.action;
    if (action === 'advance') order.status = 'in_progress';
    else if (action === 'balance') order.status = 'awaiting_balance';
    else if (action === 'paid') order.status = 'paid';
    else if (action === 'reject') order.status = 'rejected';
    else if (action === 'save') {
      const review = card.querySelector('[data-field="review"]').value;
      order.spokeConfirmed = card.querySelector('[data-field="spoke"]').checked;
      if (review === 'accepted' && !order.spokeConfirmed) { card.querySelector('.admin-save-status').textContent = 'Confirmá primero que ya hablaron para aceptar este pedido.'; return; }
      order.total = card.querySelector('[data-field="total"]').value === '' ? null : Number(card.querySelector('[data-field="total"]').value);
      order.currency = 'USD';
      order.paymentPlan = card.querySelector('[data-field="plan"]').value;
      order.paymentUrl = card.querySelector('[data-field="url"]').value.trim();
      if (review === 'rejected') order.status = 'rejected';
      else if (review === 'accepted') {
        if (order.total !== null && order.currency && order.paymentPlan) order.status = order.paymentPlan === 'full' ? 'awaiting_full_payment' : 'awaiting_advance';
        else order.status = 'accepted';
      } else order.status = 'requested';
      order.updatedAt = new Date().toISOString();
    }
    setOrders(orders);
  });
  document.querySelector('#admin-refresh').addEventListener('click', render);
  document.querySelector('.admin-order-filters').addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (!button) return; activeFilter = button.dataset.filter; document.querySelectorAll('.admin-order-filters [data-filter]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button))); render(); });
  window.addEventListener('storage', event => { if (!event.key || event.key === KEY) render(); });
  render();
})();
