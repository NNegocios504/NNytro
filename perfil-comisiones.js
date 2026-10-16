(() => {
  const PROFILE_KEY = 'nnytro-customer-profile-demo-v1';
  const CART_KEY = 'nnytro-commission-cart-v1';
  const cart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY) || '{}'); } catch { return {}; } };
  const localProfile = () => { try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch { return {}; } };
  const byId = id => document.getElementById(id);
  const avatar = byId('profile-avatar');
  const nameInput = byId('profile-name');
  const photoInput = byId('profile-photo');
  const orderList = byId('profile-order-list');
  let profilePhoto = '';
  let authenticatedUser = null;
  let csrfBusy = false;
  let cachedOrders = [];
  let authVersion = 0;
  let authRedirectMessage = '';
  const orderLoginReturnKey='nnytro-order-login-return';
  let paymentProviders = { loading:true, paypal:false,transferUsd:false,transferArs:false,aliasUsd:'',aliasArs:'' };
  function captureDynamicFormState() {
    const state = new Map();
    document.querySelectorAll('#profile-order-list .profile-order-card, #profile-admin-orders .profile-admin-order').forEach(card => {
      const id = card.dataset.orderId || '';
      card.querySelectorAll('input, textarea, select').forEach((field, index) => {
        const key = `${id}|${field.form?.className || ''}|${field.name || field.type || field.tagName}|${index}`;
        state.set(key, field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value);
      });
    });
    const openChats = [...document.querySelectorAll('#profile-order-list .profile-chat-thread:not([hidden]), #profile-admin-orders .profile-chat-thread:not([hidden])')]
      .map(chat => chat.closest('.profile-order-card')?.dataset.orderId).filter(Boolean);
    const chatDrafts = new Map([...document.querySelectorAll('#profile-order-list .profile-chat-thread, #profile-admin-orders .profile-chat-thread')].map(chat => [chat.closest('.profile-order-card')?.dataset.orderId, chat.querySelector('[name="message"]')?.value]).filter(([id, value]) => id && value !== undefined));
    return { state, openChats, chatDrafts };
  }
  function restoreDynamicFormState(snapshot) {
    document.querySelectorAll('#profile-order-list .profile-order-card, #profile-admin-orders .profile-admin-order').forEach(card => {
      const id = card.dataset.orderId || '';
      card.querySelectorAll('input, textarea, select').forEach((field, index) => {
        const key = `${id}|${field.form?.className || ''}|${field.name || field.type || field.tagName}|${index}`;
        if (!snapshot.state.has(key)) return;
        const value = snapshot.state.get(key);
        if (field.type === 'checkbox' || field.type === 'radio') field.checked = value;
        else field.value = value;
      });
    });
    snapshot.openChats.forEach(id => {
      const card = [...document.querySelectorAll('#profile-order-list .profile-order-card, #profile-admin-orders .profile-admin-order')].find(item => item.dataset.orderId === id);
      const chat = card?.querySelector('.profile-chat-thread');
      const button = card?.querySelector('[data-support-ticket-toggle]');
      if (!chat || !button) return;
      const draft = snapshot.chatDrafts.get(id);
      openSupportTicket(id,chat,button).then(() => { const field = chat.querySelector('[name="message"]'); if (field && draft !== undefined) field.value = draft; });
    });
  }

  function closeSupportTicket(mount){if(!mount)return;mount.hidden=true;clearInterval(mount._refreshTimer);mount._refreshTimer=null;if(mount._toggleButton)mount._toggleButton.textContent=t('Abrir ticket');document.querySelector('.profile-ticket-backdrop')?.remove();}
  async function openSupportTicket(orderId,mount,button){document.querySelectorAll('.profile-chat-thread:not([hidden])').forEach(open=>{if(open!==mount)closeSupportTicket(open)});mount.hidden=false;mount.dataset.orderId=String(orderId);mount._toggleButton=button;button.textContent=t('Cerrar ticket');let backdrop=document.querySelector('.profile-ticket-backdrop');if(!backdrop){backdrop=document.createElement('button');backdrop.type='button';backdrop.className='profile-ticket-backdrop';backdrop.setAttribute('aria-label',t('Cerrar ticket'));backdrop.addEventListener('click',()=>closeSupportTicket(mount));(mount.closest('.profile-page')||document.body).append(backdrop)}await loadMessages(orderId,mount);clearInterval(mount._refreshTimer);mount._refreshTimer=setInterval(()=>{if(!mount.hidden&&document.visibilityState==='visible')loadMessages(orderId,mount,true)},2000);mount.querySelector('.profile-ticket-close')?.focus();}

  function updateAvatar(user = authenticatedUser) {
    avatar.replaceChildren();
    const src = profilePhoto || user?.picture || '';
    if (src) { const img = new Image(); img.alt = ''; img.src = src; avatar.append(img); }
    else avatar.textContent = (nameInput.value.trim()[0] || user?.name?.[0] || 'N').toLocaleUpperCase('es');
  }
  function setMode(message) {
    byId('profile-auth-message').textContent = t(message);
  }
  async function api(path, options = {}) {
    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const response = await fetch(`/api/${path}`, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.body && !isForm ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(body.error || `Error del servidor (${response.status})`); error.status = response.status; throw error; }
    return body;
  }
  const t = value => window.NNytroI18n?.t(value) || value;
  const loginQuery=new URLSearchParams(location.search);
  const requestedNext=loginQuery.get('next');
  if(requestedNext){try{const target=new URL(requestedNext,location.origin);if(target.origin===location.origin&&target.pathname.endsWith('/comisiones.html'))sessionStorage.setItem(orderLoginReturnKey,`${target.pathname}${target.search}${target.hash}`)}catch{}loginQuery.delete('next');history.replaceState(null,'',`${location.pathname}${loginQuery.size?'?'+loginQuery.toString():''}${location.hash}`)}
  function continueAfterOrderLogin(){try{const target=sessionStorage.getItem(orderLoginReturnKey);if(target){sessionStorage.removeItem(orderLoginReturnKey);location.replace(target);return true}}catch{}return false}
  function safeSetProfile() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: nameInput.value.trim().slice(0, 48), photo: profilePhoto })); return true; }
    catch { return false; }
  }
  function renderCartSummary() {
    const count = Object.values(cart()).reduce((sum, q) => sum + Math.max(0, Number(q) || 0), 0);
    byId('profile-cart-summary').textContent = count ? `${t('Tenés')} ${count} ${t(count === 1 ? 'opción' : 'opciones')} ${t('en tu lista. El pedido se envía para revisión; no se cobra automáticamente.')}` : t('Todavía no agregaste opciones.');
  }
  document.addEventListener('nnytro:language-applied', () => renderCartSummary());
  function showOrders(orders) {
    orderList.querySelectorAll('.profile-chat-thread').forEach(chat=>chat.hidden?clearInterval(chat._refreshTimer):closeSupportTicket(chat));
    orderList.replaceChildren(); byId('profile-order-count').textContent = String(orders.length);
    if (!orders.length) { const p = document.createElement('p'); p.className = 'profile-order-empty'; p.textContent = t('Todavía no hay pedidos asociados a tu cuenta.'); orderList.append(p); return; }
    const labels = { requested:'Esperando revisión de NNytro', accepted:'Pedido aceptado · preparando cotización', rejected:'Pedido rechazado', awaiting_full_payment:'Esperando pago completo', awaiting_advance:'Esperando adelanto', advance_paid:'Adelanto recibido · trabajo pendiente', in_progress:'Trabajo en curso', paid:'Pago recibido', awaiting_balance:'Falta pagar el saldo', awaiting_publication:'Terminado · publicación pendiente', completed_paid:'Comisión terminada y pagada', cancelled:'Pedido cancelado' };
    orders.forEach(order => {
      const card = document.createElement('article'); card.className = 'profile-order-card';
      card.dataset.orderId = String(order.id || '');
      const head = document.createElement('header'); const code = document.createElement('span'); code.textContent = `NN-${String(order.id || '').slice(0, 8).toUpperCase()}`; const time = document.createElement('time');
      if (order.created_at && !Number.isNaN(Date.parse(order.created_at))) { time.dateTime = order.created_at; time.textContent = new Intl.DateTimeFormat(window.NNytroI18n?.getLanguage?.() || 'es-AR', { dateStyle:'medium' }).format(new Date(order.created_at)); }
      head.append(code, time);
      const status = document.createElement('strong'); status.textContent = t(labels[order.status] || 'Pedido en seguimiento'); card.append(head, status);
      let items = []; try { items = JSON.parse(order.items_json || '[]'); } catch { }
      const detail = document.createElement('small'); detail.textContent = items.map(item => `${t(item.name || item.id || 'Opción')} × ${Number(item.quantity) || 1}`).join(' · ') || t('Detalle de pedido disponible en el ticket'); card.append(detail);
      if (Number(order.total_usd) > 0) { const price = document.createElement('small'); price.textContent = `${t('Cotización acordada:')} USD ${Number(order.total_usd).toFixed(2)}`; card.append(price); }
      else if (Number(order.total_brl) > 0) { const price = document.createElement('small'); price.textContent = `${t('Cotización histórica:')} BRL ${Number(order.total_brl).toFixed(2)}`; card.append(price); }
      if(order.pending_transfer_payment_id){let transfer={};try{transfer=JSON.parse(order.pending_transfer_receipt_json||'{}').transfer||{}}catch{}const currency=transfer.currency||'USD',amount=Number(transfer.amountLocal||order.pending_transfer_amount||0);const notice=document.createElement('small');notice.className='profile-transfer-review';notice.textContent=order.pending_transfer_status==='pending'?`${t('Transferencia informada · pendiente de revisión de NNytro:')} ${currency} ${amount.toFixed(2)}${currency==='ARS'?` · ${t('equivale a')} USD ${Number(order.pending_transfer_amount).toFixed(2)}`:''}`:`${t('Transferencia preparada:')} ${currency} ${amount.toFixed(2)}${currency==='ARS'?` · ${t('equivale a')} USD ${Number(order.pending_transfer_amount).toFixed(2)}`:''}`;card.append(notice);if(order.pending_transfer_status==='created'&&transfer.alias){const aliasLabel=document.createElement('label');aliasLabel.textContent=`${t('Alias de destino')} (${currency})`;const alias=document.createElement('input');alias.readOnly=true;alias.value=transfer.alias;const copy=document.createElement('button');copy.type='button';copy.className='profile-inline-button';copy.textContent=t('Copiar alias');copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(transfer.alias);copy.textContent=t('Copiado')}catch{alias.focus();alias.select();copy.textContent=t('Seleccioná y copiá el alias')}});const reference=document.createElement('input');reference.maxLength=120;reference.placeholder=t('Referencia o comprobante (opcional)');const report=document.createElement('button');report.type='button';report.className='profile-inline-button';report.textContent=t('Ya transferí · avisar a NNytro');report.addEventListener('click',async()=>{report.disabled=true;try{await api('payments/transfer-report',{method:'POST',body:JSON.stringify({paymentId:order.pending_transfer_payment_id,reference:reference.value})});await loadOrders()}catch(error){notice.textContent=t(error.message);report.disabled=false}});const cancel=document.createElement('button');cancel.type='button';cancel.className='profile-inline-button';cancel.textContent=t('Cancelar transferencia preparada');cancel.addEventListener('click',async()=>{if(!window.confirm(t('¿Cancelar esta transferencia antes de enviarla?')))return;cancel.disabled=true;try{await api('payments/cancel',{method:'POST',body:JSON.stringify({paymentId:order.pending_transfer_payment_id})});await loadOrders()}catch(error){notice.textContent=t(error.message);cancel.disabled=false}});card.append(aliasLabel,alias,copy,reference,report,cancel)}}
      const controls = document.createElement('div'); controls.className = 'profile-order-controls';
      if (['awaiting_full_payment','awaiting_advance','awaiting_balance'].includes(order.status) && Number(order.total_usd)>0) {
        const checkout = document.createElement('section'); checkout.className = 'profile-payment-checkout';
        const heading = document.createElement('h3'); heading.textContent = t(order.status === 'awaiting_full_payment' ? 'Pagar el total' : order.status === 'awaiting_advance' ? 'Pagar el adelanto del 50%' : 'Pagar el saldo restante');
        const amount = document.createElement('p'); amount.className = 'profile-payment-amount';
        const half = Math.round((Number(order.total_usd) / 2 + Number.EPSILON) * 100) / 100;
        const due = order.status === 'awaiting_full_payment' ? Number(order.total_usd) : order.status === 'awaiting_advance' ? half : Math.max(0, Number(order.total_usd) - half);
        amount.textContent = `${t('Importe de esta etapa:')} USD ${due.toFixed(2)}`;
        const buttons = document.createElement('div'); buttons.className = 'profile-payment-methods';
        const result = document.createElement('div'); result.className = 'profile-payment-result'; result.setAttribute('aria-live','polite');
        const status = document.createElement('small'); status.setAttribute('role','status');
        checkout.append(heading, amount, buttons, result, status);
        if(order.pending_transfer_payment_id){const waiting=document.createElement('small');waiting.className='profile-payment-unavailable';waiting.textContent=t(order.pending_transfer_status==='pending'?'Ya avisaste de una transferencia. Esperá a que NNytro revise el ingreso.':'Tenés una transferencia preparada arriba. Avisá cuando hayas transferido.');buttons.append(waiting)}else{
          if(paymentProviders.paypal){const button=document.createElement('button');button.type='button';button.className='profile-inline-button';button.textContent=`${t('Pagar con')} PayPal`;button.addEventListener('click',()=>startCheckout(order.id,'paypal',button,buttons,result,status));buttons.append(button)}
          if(paymentProviders.transferUsd){const button=document.createElement('button');button.type='button';button.className='profile-inline-button';button.textContent=t('Transferir USD');button.addEventListener('click',()=>startCheckout(order.id,'transfer_usd',button,buttons,result,status));buttons.append(button)}
        if(paymentProviders.transferArs){const rate=Number(order.ars_exchange_rate);if(Number.isFinite(rate)&&rate>0){const localAmount=Math.round((due*rate+Number.EPSILON)*100)/100,form=document.createElement('form');form.className='profile-transfer-ars-form';form.innerHTML=`<p>${t('Importe calculado por NNytro')}: <strong>ARS ${localAmount.toFixed(2)}</strong></p><small>USD ${due.toFixed(2)} × ${rate.toFixed(2)} ARS/USD</small><button type="submit" class="profile-inline-button">${t('Preparar transferencia en pesos')}</button>`;form.addEventListener('submit',event=>{event.preventDefault();startCheckout(order.id,'transfer_ars',form.querySelector('button'),buttons,result,status)});buttons.append(form)}else{const missing=document.createElement('small');missing.className='profile-payment-unavailable';missing.textContent=t('NNytro todavía no configuró el cambio en pesos para este pedido.');buttons.append(missing)}}
          if(!paymentProviders.paypal&&!paymentProviders.transferUsd&&!paymentProviders.transferArs){const unavailable=document.createElement('small');unavailable.className='profile-payment-unavailable';unavailable.textContent=t(paymentProviders.loading?'Consultando opciones de pago…':'No hay métodos de pago configurados todavía.');buttons.append(unavailable)}
        }
        controls.append(checkout);
      }
      const chatButton = document.createElement('button'); chatButton.type = 'button'; chatButton.className = 'profile-inline-button'; chatButton.dataset.supportTicketToggle='';chatButton.textContent = t('Abrir ticket');
      const chat = document.createElement('div'); chat.className = 'profile-chat-thread'; chat.hidden = true;
      chatButton.addEventListener('click', () => chat.hidden ? void openSupportTicket(order.id,chat,chatButton) : closeSupportTicket(chat));
      const receiptButton=document.createElement('button');receiptButton.type='button';receiptButton.className='profile-inline-button';receiptButton.textContent=t('Ver recibos de pago');
      const receiptPanel=document.createElement('div');receiptPanel.className='profile-payment-receipts';receiptPanel.hidden=true;
      receiptButton.addEventListener('click',async()=>{receiptPanel.hidden=!receiptPanel.hidden;receiptButton.textContent=t(receiptPanel.hidden?'Ver recibos de pago':'Ocultar recibos');if(receiptPanel.hidden)return;receiptPanel.replaceChildren();const loading=document.createElement('small');loading.textContent=t('Cargando recibos…');receiptPanel.append(loading);try{const data=await api(`orders/${encodeURIComponent(order.id)}/payments`);receiptPanel.replaceChildren();if(!data.payments?.length){const empty=document.createElement('small');empty.textContent=t('Todavía no hay pagos registrados.');receiptPanel.append(empty);return;}data.payments.forEach(payment=>{const receipt=document.createElement('article');receipt.className='profile-payment-receipt';const title=document.createElement('strong');const provider=payment.provider==='mercadopago'?'Mercado Pago':payment.provider==='paypal'?'PayPal':payment.provider==='transfer_usd'?'Transferencia USD':payment.provider==='transfer_ars'?'Transferencia ARS':'Pix';const leg=payment.leg==='advance'?'adelanto':payment.leg==='balance'?'saldo':'pago completo';title.textContent=`${provider} · ${t(leg)} · USD ${Number(payment.amount).toFixed(2)}`;const state=document.createElement('small');state.textContent=t(payment.status==='paid'?'Verificado':payment.status==='refunded'?'Reembolsado':payment.status==='failed'?'No aprobado':'Pendiente de confirmación');receipt.append(title,state);if(payment.receipt?.transfer){const transfer=payment.receipt.transfer,local=document.createElement('small');local.textContent=`${transfer.currency} ${Number(transfer.amountLocal).toFixed(2)}${transfer.currency==='ARS'?` · ${Number(transfer.exchangeRate).toFixed(2)} ARS/USD`:''}`;receipt.append(local)}if(payment.verifiedAt){const date=document.createElement('time');date.dateTime=payment.verifiedAt;date.textContent=new Intl.DateTimeFormat(window.NNytroI18n?.getLanguage?.()||'es-AR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(payment.verifiedAt));receipt.append(date)}const ref=payment.receipt?.id||payment.receipt?.providerReference||payment.receipt?.customerReference;if(ref){const code=document.createElement('small');code.textContent=`${t('Comprobante')}: ${ref}`;receipt.append(code)}receiptPanel.append(receipt)});}catch(error){receiptPanel.replaceChildren();const message=document.createElement('small');message.textContent=t(error.message);receiptPanel.append(message)}});
      controls.append(chatButton,receiptButton,receiptPanel);card.append(controls);
      if (order.published_at) {
        const published=document.createElement('p');published.className='profile-review-pending';published.textContent=t('¡Tu comisión ya está publicada en Comisiones hechas! Cuando quieras, podés dejar una reseña.');const galleryLink=document.createElement('a');galleryLink.className='profile-action-link';galleryLink.href='./comisiones-hechas.html';galleryLink.textContent=t('Ver publicación ↗');card.append(published,galleryLink);
        if(order.has_review===true||Number(order.has_review)===1){const sent=document.createElement('p');sent.className='profile-consent-state';sent.textContent=t('Gracias: tu reseña ya fue enviada.');card.append(sent)}
        else{
          const review=document.createElement('form');review.className='profile-review-form';review.innerHTML=`<h3>${t('Dejá tu reseña')}</h3><label>${t('Estrellas')} <select name="rating" required><option value="">${t('Elegí de 0 a 5')}</option><option value="5">5 · ${t('excelente')}</option><option value="4">4 · ${t('muy bien')}</option><option value="3">3 · ${t('bien')}</option><option value="2">2 · ${t('podría mejorar')}</option><option value="1">1 · ${t('no fue lo esperado')}</option><option value="0">0 · ${t('sin estrellas')}</option></select></label><label>${t('Reseña opcional')}<textarea name="comment" rows="3" maxlength="1500" placeholder="${t('Contá cómo fue tu experiencia')}"></textarea></label><button type="submit">${t('Enviar reseña')}</button><small role="status"></small>`;
          review.addEventListener('submit',async event=>{event.preventDefault();const submit=review.querySelector('button');const status=review.querySelector('[role=status]');submit.disabled=true;try{await api(`orders/${encodeURIComponent(order.id)}/reviews`,{method:'POST',body:JSON.stringify({rating:Number(review.elements.rating.value),comment:review.elements.comment.value})});status.textContent=t('¡Gracias! Tu reseña quedó enviada.');await loadOrders()}catch(error){status.textContent=t(error.message);submit.disabled=false}});card.append(review);
        }
      } else if(order.status==='completed_paid') {
        const reviewHint=document.createElement('small');reviewHint.className='profile-review-pending';reviewHint.textContent=t('Tu comisión está terminada y pagada. Cuando se publique, recibirás una notificación y podrás dejar una reseña.');card.append(reviewHint);
      }
      card.append(chat); orderList.append(card);
    });
  }
  async function startCheckout(orderId, provider, button, buttons, result, status) {
    buttons.querySelectorAll('button').forEach(item=>item.disabled=true); status.textContent=t('Preparando el pago…'); result.replaceChildren();
    try {
      const transfer=provider==='transfer_usd'||provider==='transfer_ars',currency=provider==='transfer_ars'?'ARS':'USD',payload=transfer?{orderId,currency}:{orderId,provider};
      const data=await api(transfer?'payments/transfer':'payments/checkout',{method:'POST',body:JSON.stringify(payload)});
      if(transfer){const line=document.createElement('p');line.className='profile-payment-amount';line.textContent=data.currency==='ARS'?`${t('Transferí')} ARS ${Number(data.amountLocal).toFixed(2)} · ${t('equivale a')} USD ${Number(data.amountUsd).toFixed(2)} (${t('cambio acordado')}: ${Number(data.exchangeRate).toFixed(2)} ARS/USD).`:`${t('Transferí')} USD ${Number(data.amountUsd).toFixed(2)}.`;const aliasLabel=document.createElement('label');aliasLabel.textContent=`${t('Alias de destino')} (${data.currency})`;const alias=document.createElement('input');alias.readOnly=true;alias.value=data.alias;alias.setAttribute('aria-label',aliasLabel.textContent);const copy=document.createElement('button');copy.type='button';copy.className='profile-inline-button';copy.textContent=t('Copiar alias');copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(data.alias);copy.textContent=t('Copiado')}catch{alias.focus();alias.select();copy.textContent=t('Seleccioná y copiá el alias')}});const help=document.createElement('small');help.textContent=t('Después de transferir, avisá por acá. El pago queda pendiente hasta que NNytro verifique el ingreso en su cuenta.');const reference=document.createElement('input');reference.maxLength=120;reference.placeholder=t('Referencia o comprobante (opcional)');reference.setAttribute('aria-label',reference.placeholder);const report=document.createElement('button');report.type='button';report.className='profile-inline-button';report.textContent=t('Ya transferí · avisar a NNytro');report.addEventListener('click',async()=>{report.disabled=true;try{await api('payments/transfer-report',{method:'POST',body:JSON.stringify({paymentId:data.paymentId,reference:reference.value})});status.textContent=t('Aviso enviado. El pago sigue pendiente de revisión manual.');await loadOrders()}catch(error){status.textContent=t(error.message);report.disabled=false}});result.append(line,aliasLabel,alias,copy,help,reference,report);status.textContent=data.status==='pending'?t('Transferencia ya informada; esperando revisión.'):t('Revisá el alias y el importe antes de transferir.');return;}
      status.textContent=`${t('Importe:')} USD ${Number(data.amountUsd).toFixed(2)} · ${t(data.leg==='advance'?'adelanto':data.leg==='balance'?'saldo':'pago completo')}. ${t('El estado cambia cuando el proveedor confirma el pago.')}`;
      if(provider==='pix') {
        const qrBase64=data.qrCodeBase64||(data.qrCode&&!/^000201/.test(data.qrCode)&&/^[A-Za-z0-9+/]+={0,2}$/.test(data.qrCode)?data.qrCode:null);
        const pixPayload=data.qrCode&&/^000201/.test(data.qrCode)?data.qrCode:null;
        if(qrBase64) { const image=document.createElement('img');image.className='profile-pix-qr';image.alt=t('Código QR Pix');image.src=qrBase64.startsWith('data:')?qrBase64:`data:image/png;base64,${qrBase64}`;result.append(image); }
        if(pixPayload) { const label=document.createElement('label');label.textContent=t('Código Pix para copiar');const payload=document.createElement('textarea');payload.readOnly=true;payload.rows=4;payload.value=pixPayload;const copy=document.createElement('button');copy.type='button';copy.className='profile-inline-button';copy.textContent=t('Copiar código Pix');copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(payload.value);copy.textContent=t('Copiado');}catch{payload.focus();payload.select();copy.textContent=t('Seleccioná y copiá el código');}});result.append(label,payload,copy); }
        if(data.checkoutUrl) { const link=document.createElement('a');link.className='profile-action-link';link.href=data.checkoutUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent=t('Abrir instrucciones de pago ↗');result.append(link); }
        const refresh=document.createElement('button');refresh.type='button';refresh.className='profile-inline-button';refresh.textContent=t('Ya pagué · actualizar estado');refresh.addEventListener('click',async()=>{refresh.disabled=true;status.textContent=t('Consultando el estado verificado…');try{await loadOrders();status.textContent=t('Estado actualizado desde el servidor.')}catch(error){status.textContent=t(error.message)}finally{refresh.disabled=false}});result.append(refresh);
        if(!qrBase64&&!pixPayload&&!data.checkoutUrl) status.textContent=t('El proveedor no devolvió un QR ni un enlace de pago. No se registró un pago.');
      } else if(data.checkoutUrl) { window.location.assign(data.checkoutUrl); }
      else status.textContent=t('El proveedor no devolvió un enlace de pago. No se registró un pago.');
    } catch(error) { status.textContent=t(error.message); }
    finally { buttons.querySelectorAll('button').forEach(item=>item.disabled=false); }
  }
  async function handlePaymentReturn() {
    const params=new URLSearchParams(location.search);const mode=params.get('payment');
    if(mode==='paypal-return') {
      const paymentId=params.get('payment_id');const paypalOrderId=params.get('token')||params.get('orderID');
      const status=document.createElement('p');status.className='profile-payment-return';status.setAttribute('role','status');status.textContent=t('Confirmando el pago con PayPal…');orderList.prepend(status);
      if(!paymentId||!paypalOrderId){status.textContent=t('No se encontraron los datos de retorno de PayPal. Consultá el pedido para reintentar.');return;}
      try { const result=await api('payments/capture',{method:'POST',body:JSON.stringify({paymentId,providerOrderId:paypalOrderId})});status.textContent=result.paid?t('Pago verificado por PayPal. Actualizando tu pedido…'):`${t('PayPal todavía no confirmó el pago')} (${t(result.status||'pendiente')}).`;await loadOrders(); }
      catch(error){status.textContent=`${t('PayPal no pudo confirmar el pago:')} ${t(error.message)}. ${t('Tu pedido no se marca como pagado.')}`;await loadOrders();}
      params.delete('payment');params.delete('payment_id');params.delete('token');params.delete('orderID');history.replaceState({},'',`${location.pathname}${params.size?'?'+params.toString():''}${location.hash}`);
    } else if(mode==='cancelled') { const status=document.createElement('p');status.className='profile-payment-return';status.textContent=t('Volviste de PayPal sin completar el pago. El pedido sigue pendiente.');orderList.prepend(status);const paymentId=params.get('payment_id');if(paymentId){try{await api('payments/cancel',{method:'POST',body:JSON.stringify({paymentId})});status.textContent=t('El pago se canceló y podés elegir otro método.');await loadOrders()}catch{}}params.delete('payment');params.delete('payment_id');history.replaceState({},'',`${location.pathname}${params.size?'?'+params.toString():''}${location.hash}`); }
    else if(mode==='return') { const status=document.createElement('p');status.className='profile-payment-return';status.textContent=t('Volviste de Mercado Pago. Estamos actualizando el pedido; solo se marcará pagado cuando el proveedor lo confirme.');orderList.prepend(status);try{await loadOrders()}finally{params.delete('payment');history.replaceState({},'',`${location.pathname}${params.size?'?'+params.toString():''}${location.hash}`)} }
  }
  async function loadMessages(orderId, mount, preserveDraft=false) {
    if(mount._loadingMessages)return;mount._loadingMessages=true;
    try{
      const {messages=[]}=await api(`orders/${encodeURIComponent(orderId)}/messages`),signature=JSON.stringify(messages.map(message=>[message.id,message.body,message.created_at]));
      if(mount._messagesSignature===signature&&!mount._forceMessageRender)return;
      mount._messagesSignature=signature;mount._forceMessageRender=false;const draft=preserveDraft?mount.querySelector('[name="message"]')?.value||'':'';mount.replaceChildren();
      const header=document.createElement('header');header.className='profile-ticket-header';const heading=document.createElement('div'),kicker=document.createElement('small'),title=document.createElement('strong'),close=document.createElement('button');kicker.textContent=t('TICKET DE SOPORTE');title.textContent=`NN-${String(orderId).slice(0,8).toUpperCase()}`;heading.append(kicker,title);close.type='button';close.className='profile-ticket-close';close.setAttribute('aria-label',t('Cerrar ticket'));close.textContent='×';close.addEventListener('click',()=>closeSupportTicket(mount));header.append(heading,close);
      const toolbar=document.createElement('div');toolbar.className='profile-chat-toolbar';const live=document.createElement('small');live.textContent=t('Actualización automática cada 2 segundos');const refresh=document.createElement('button');refresh.type='button';refresh.className='profile-inline-button';refresh.textContent=t('Actualizar ahora');refresh.addEventListener('click',()=>{mount._forceMessageRender=true;loadMessages(orderId,mount,true)});toolbar.append(live,refresh);
      const list=document.createElement('div');list.className='profile-message-list';
      if(!messages.length){const empty=document.createElement('p');empty.className='profile-order-empty';empty.textContent=t('Todavía no hay respuestas en este ticket.');list.append(empty)}
      messages.forEach(message=>{const bubble=document.createElement('p');bubble.className=message.sender_sub===authenticatedUser?.sub?'profile-ticket-message profile-ticket-message--mine':'profile-ticket-message';const author=document.createElement('strong');author.textContent=message.sender_sub===authenticatedUser?.sub?t('Vos'):t(authenticatedUser?.isAdmin?'Cliente':'NNytro');const body=document.createElement('span');body.textContent=message.body;bubble.append(author,body);const time=document.createElement('small');if(message.created_at)time.textContent=new Intl.DateTimeFormat(window.NNytroI18n?.getLanguage?.()||'es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(message.created_at));bubble.append(time);list.append(bubble)});
      const form=document.createElement('form');form.className='profile-message-form';form.innerHTML=`<label>${t('Tu respuesta')}<textarea name="message" rows="2" maxlength="4000" required placeholder="${t(authenticatedUser?.isAdmin?'Respondé al cliente en este ticket':'Escribile a NNytro en este ticket')}"></textarea></label><button type="submit">${t('Enviar respuesta')}</button><small role="status"></small>`;mount.append(header,toolbar,list,form);form.elements.message.value=draft;list.scrollTop=list.scrollHeight;
      form.addEventListener('submit',async event=>{event.preventDefault();const input=form.elements.message,status=form.querySelector('[role=status]'),message=input.value.trim();if(!message)return;const send=form.querySelector('button');send.disabled=true;try{await api(`orders/${encodeURIComponent(orderId)}/messages`,{method:'POST',body:JSON.stringify({message})});status.textContent=t('Respuesta enviada.');mount._forceMessageRender=true;await loadMessages(orderId,mount);const next=mount.querySelector('[name="message"]');next?.focus()}catch(error){status.textContent=t(error.message)}finally{send.disabled=false}});
    }catch(error){mount.replaceChildren();const notice=document.createElement('p');notice.className='profile-order-empty';notice.textContent=error.message;mount.append(notice)}finally{mount._loadingMessages=false}
  }
  async function loadOrders() {
    try { const data = await api('orders'); cachedOrders = data.orders || []; showOrders(cachedOrders); if (authenticatedUser?.isAdmin) { renderAdminOrders(cachedOrders); await loadAdminPublications(); } }
    catch (error) { showOrders([]); if (error.status === 401) { const p = document.createElement('p'); p.className='profile-order-empty'; p.textContent=t('Iniciá sesión para consultar los pedidos vinculados a tu cuenta.'); orderList.replaceChildren(p); } else { const p=document.createElement('p');p.className='profile-order-empty';p.textContent=`${t('No se pudo cargar el historial:')} ${t(error.message)}`;orderList.replaceChildren(p); } }
  }
  async function loadPaymentProviders(){paymentProviders={loading:true,paypal:false,transferUsd:false,transferArs:false,aliasUsd:'',aliasArs:''};try{const result=await api('payments/providers');paymentProviders={loading:false,paypal:Boolean(result.paypal),transferUsd:Boolean(result.transferUsd),transferArs:Boolean(result.transferArs),aliasUsd:result.aliasUsd||'',aliasArs:result.aliasArs||''};}catch{paymentProviders={loading:false,paypal:false,transferUsd:false,transferArs:false,aliasUsd:'',aliasArs:''};}if(authenticatedUser&&cachedOrders.length){const snapshot=captureDynamicFormState();showOrders(cachedOrders);restoreDynamicFormState(snapshot)}}
  function renderAdminOrders(orders) {
    const root=byId('profile-admin-orders');root.querySelectorAll('.profile-chat-thread').forEach(chat=>chat.hidden?clearInterval(chat._refreshTimer):closeSupportTicket(chat));root.replaceChildren();
    if(!orders.length){const p=document.createElement('p');p.className='profile-order-empty';p.textContent=t('No hay pedidos para revisar.');root.append(p);return;}
    const states={requested:'Pendiente de aceptar o rechazar',accepted:'Esperando tu cotización',awaiting_full_payment:'Esperando pago completo verificado',awaiting_advance:'Esperando adelanto verificado',advance_paid:'Adelanto verificado · listo para comenzar',paid:'Pago completo verificado',in_progress:'Trabajo en curso',awaiting_balance:'Esperando saldo verificado',awaiting_publication:'Listo para publicar, si hay pago verificado',completed_paid:'Completado y pagado',rejected:'Rechazado',cancelled:'Cancelado'};
    orders.forEach(order=>{
      const card=document.createElement('article');card.className='profile-order-card profile-admin-order';
      card.dataset.orderId=String(order.id||'');
      const head=document.createElement('header');const code=document.createElement('span');code.textContent=String(order.id);const who=document.createElement('span');who.textContent=`${order.customer_name||'Cliente'} · ${order.customer_email||''}`;head.append(code,who);
      const state=document.createElement('strong');state.textContent=t(states[order.status]||order.status);card.append(head,state);
      const detail=document.createElement('small');detail.textContent=`${t('Contacto:')} ${order.contact||'—'}${order.details?` · ${order.details}`:''}`;card.append(detail);
      const arsRateForm=document.createElement('form');arsRateForm.className='profile-admin-inline-form';arsRateForm.innerHTML=`<label>${t('Cambio para este pedido (ARS por USD)')}<input name="arsPerUsd" type="number" min="0.01" step="0.01" required value="${Number(order.ars_exchange_rate)>0?Number(order.ars_exchange_rate):''}" placeholder="${t('ARS por cada USD')}"></label><button type="submit">${t('Guardar cambio')}</button>`;arsRateForm.addEventListener('submit',event=>{event.preventDefault();adminPatch(order.id,{action:'set_ars_rate',arsPerUsd:Number(arsRateForm.elements.arsPerUsd.value)},card)});card.append(arsRateForm);
      let pendingTransfer={};try{pendingTransfer=JSON.parse(order.pending_transfer_receipt_json||'{}').transfer||{}}catch{}if(order.pending_transfer_payment_id){const report=document.createElement('p');report.className='profile-transfer-review';report.textContent=`${t('Transferencia para revisar:')} ${pendingTransfer.currency||'USD'} ${Number(pendingTransfer.amountLocal||order.pending_transfer_amount||0).toFixed(2)} · ${t('equivale a')} USD ${Number(order.pending_transfer_amount).toFixed(2)} · ${t('alias')} ${pendingTransfer.alias||'—'}${pendingTransfer.currency==='ARS'?` · ${Number(pendingTransfer.exchangeRate).toFixed(2)} ARS/USD`:''}`;card.append(report)}
      const chatButton=document.createElement('button');chatButton.type='button';chatButton.className='profile-inline-button';chatButton.dataset.supportTicketToggle='';chatButton.textContent=t('Abrir ticket');
      const chat=document.createElement('div');chat.className='profile-chat-thread';chat.hidden=true;
      chatButton.addEventListener('click',()=>chat.hidden?void openSupportTicket(order.id,chat,chatButton):closeSupportTicket(chat));
      card.append(chatButton,chat);
      let items=[];try{items=JSON.parse(order.items_json||'[]')}catch{}const list=document.createElement('small');list.textContent=items.map(item=>`${item.id} × ${item.quantity}`).join(' · ');card.append(list);
      const actions=document.createElement('div');actions.className='profile-admin-actions';
      const deleteOrder=document.createElement('button');deleteOrder.type='button';deleteOrder.className='profile-admin-delete';deleteOrder.textContent=t('Borrar pedido');deleteOrder.addEventListener('click',async()=>{if(!window.confirm(t('¿Borrar definitivamente este pedido y sus datos de pago y publicación?')))return;deleteOrder.disabled=true;try{await api(`admin/orders/${encodeURIComponent(order.id)}`,{method:'DELETE'});await loadOrders()}catch(error){deleteOrder.disabled=false;let status=card.querySelector('[data-delete-status]');if(!status){status=document.createElement('small');status.dataset.deleteStatus='';card.append(status)}status.textContent=t(error.message)}});actions.append(deleteOrder);
      if(order.pending_transfer_payment_id&&order.pending_transfer_status==='pending'){const confirmTransfer=document.createElement('button');confirmTransfer.type='button';confirmTransfer.textContent=t('Confirmar transferencia recibida');confirmTransfer.addEventListener('click',()=>{if(window.confirm(t('Confirmá solo si verificaste el ingreso en la cuenta.')))adminPatch(order.id,{action:'confirm_transfer',paymentId:order.pending_transfer_payment_id},card)});const rejectTransfer=document.createElement('button');rejectTransfer.type='button';rejectTransfer.textContent=t('No recibida · rechazar aviso');rejectTransfer.addEventListener('click',()=>{if(window.confirm(t('¿Verificaste que no ingresó la transferencia?')))adminPatch(order.id,{action:'reject_transfer',paymentId:order.pending_transfer_payment_id,reason:'Transferencia no recibida o no coincide con el importe.'},card)});actions.append(confirmTransfer,rejectTransfer)}
      if(order.status==='requested'){
        const accept=document.createElement('button');accept.type='button';accept.textContent=t('Aceptar: ya hablamos');accept.addEventListener('click',()=>adminPatch(order.id,{action:'accept'},card));
        const rejectForm=document.createElement('form');rejectForm.className='profile-admin-inline-form';rejectForm.innerHTML=`<label>${t('Motivo opcional')}<input name="reason" maxlength="500" placeholder="${t('Por qué no puedo tomarlo')}"></label><button type="submit">${t('Rechazar')}</button>`;rejectForm.addEventListener('submit',event=>{event.preventDefault();adminPatch(order.id,{action:'reject',reason:rejectForm.elements.reason.value},card)});actions.append(accept,rejectForm);
      }
      if(order.status==='accepted'){
        const quote=document.createElement('form');quote.className='profile-admin-inline-form profile-admin-quote';quote.innerHTML=`<label>${t('Total acordado en USD')}<input name="total" type="number" min="0.01" step="0.01" required placeholder="0,00"></label><label>${t('Forma de pago')}<select name="plan"><option value="full">${t('Pago completo')}</option><option value="deposit_50">${t('50% de adelanto y saldo')}</option></select></label><button type="submit">${t('Enviar cotización')}</button>`;quote.addEventListener('submit',event=>{event.preventDefault();adminPatch(order.id,{action:'quote',totalUsd:Number(quote.elements.total.value),paymentPlan:quote.elements.plan.value},card)});actions.append(quote);
      }
      if(['advance_paid','paid'].includes(order.status)){const start=document.createElement('button');start.type='button';start.textContent=t('Comenzar trabajo');start.addEventListener('click',()=>adminPatch(order.id,{action:'start_work'},card));actions.append(start)}
      if(order.status==='in_progress'){const finish=document.createElement('button');finish.type='button';finish.textContent=t('Trabajo terminado');finish.addEventListener('click',()=>adminPatch(order.id,{action:'finish_work'},card));actions.append(finish)}
      if(order.status==='completed_paid'){
        const publish=document.createElement('form');publish.className='profile-admin-publish';publish.innerHTML=`<h3>${t('Publicar comisión')}</h3><p>${t('Disponible cuando el trabajo está terminado y el pago completo fue verificado. El nombre del cliente es opcional.')}</p><label>${t('Título')}<input name="title" maxlength="120" required></label><label>${t('Descripción')}<textarea name="brief" maxlength="2000" required rows="2"></textarea></label><label>${t('Nombre para mostrar (opcional)')}<input name="chosenName" maxlength="80" value="${String(order.public_chosen_name||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}"></label><label>${t('Precio inicial (USD)')}<input name="initial" type="number" min="0" step="0.01" required></label><label>${t('Precio final acordado (USD)')}<input name="final" type="number" min="0.01" step="0.01" required></label><label>${t('Por qué cambió el precio')}<textarea name="reason" maxlength="1000" rows="2"></textarea></label><label>${t('Video del proceso (MP4 o WEBM, hasta 24 MiB)')}<input name="videoFile" type="file" accept="video/mp4,video/webm"></label><label>${t('O URL HTTPS del video')}<input name="video" type="url" placeholder="${t('Opcional')}"></label><label>${t('Imágenes finales (JPG, PNG, WEBP o GIF; hasta 24 MiB cada una)')}<input name="imageFiles" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple></label><label>${t('URLs HTTPS de imágenes finales (una por línea)')}<textarea name="images" required rows="3"></textarea></label><label>${t('Referencias (imágenes opcionales; hasta 24 MiB cada una)')}<input name="referenceFiles" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple></label><label>${t('URLs HTTPS de referencias (una por línea)')}<textarea name="references" rows="2"></textarea></label><button type="submit">${t('Publicar comisión')}</button><small role="status"></small>`;
        const submitButton=publish.querySelector('button[type="submit"]');let uploadCount=0;
        const upload=async(file)=>{const data=new FormData();data.append('file',file);const response=await fetch('/api/media/upload',{method:'POST',credentials:'same-origin',body:data});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||`Error del servidor (${response.status})`);let asset;try{asset=new URL(result.url,location.href)}catch{}if(!asset||(asset.protocol!=='https:'&&!(asset.origin===location.origin&&asset.pathname.startsWith('/api/media/gallery/'))))throw new Error(t('El servidor no devolvió una URL segura para el archivo.'));return asset.href};
        const uploading=async(fn)=>{uploadCount+=1;submitButton.disabled=true;try{await fn()}finally{uploadCount=Math.max(0,uploadCount-1);submitButton.disabled=uploadCount>0}};
        for(const [inputName,targetName] of [['imageFiles','images'],['referenceFiles','references']])publish.elements[inputName].addEventListener('change',async()=>{const field=publish.elements[inputName],target=publish.elements[targetName],status=publish.querySelector('[role=status]');if(!field.files.length)return;await uploading(async()=>{try{for(const file of field.files){status.textContent=t(`Subiendo ${file.name}…`);const url=await upload(file);target.value=[target.value.trim(),url].filter(Boolean).join('\n')}status.textContent=t('Archivos subidos.')}catch(error){status.textContent=t(error.message)}finally{field.value=''}})});
        publish.elements.videoFile.addEventListener('change',async()=>{const field=publish.elements.videoFile,status=publish.querySelector('[role=status]'),file=field.files[0];if(!file)return;await uploading(async()=>{try{status.textContent=t(`Subiendo ${file.name}…`);publish.elements.video.value=await upload(file);status.textContent=t('Video subido.')}catch(error){status.textContent=t(error.message)}finally{field.value=''}})});
        publish.addEventListener('submit',event=>{event.preventDefault();const f=publish.elements;const lines=v=>v.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);adminPublish(order.id,{title:f.title.value,brief:f.brief.value,chosenName:f.chosenName.value.trim(),initialPriceUsd:Number(f.initial.value),finalPriceUsd:Number(f.final.value),priceChangeReason:f.reason.value,processVideo:f.video.value,finalImages:lines(f.images.value),referenceImages:lines(f.references.value)},card)});actions.append(publish);
      }
      if(actions.childElementCount)card.append(actions);root.append(card);
    });
  }
  async function loadAdminPublications(){const root=byId('profile-admin-publications');if(!root)return;try{const data=await api('admin/commissions');renderAdminPublications(data.commissions||[])}catch(error){root.replaceChildren();const p=document.createElement('p');p.className='profile-order-empty';p.textContent=`${t('No se pudieron cargar las publicaciones:')} ${t(error.message)}`;root.append(p)}}
  function renderAdminPublications(rows){const root=byId('profile-admin-publications');root.replaceChildren();if(!rows.length){const p=document.createElement('p');p.className='profile-order-empty';p.textContent=t('Todavía no hay comisiones publicadas.');root.append(p);return}rows.forEach(item=>{const card=document.createElement('article');card.className='profile-admin-publication';const heading=document.createElement('h3');heading.textContent=item.title||t('Comisión publicada');const meta=document.createElement('small');meta.textContent=`${item.chosen_name||t('Sin nombre público')} · ${item.published_at||''} · ${t('Pedido')} ${String(item.order_id||'').slice(0,8)}`;card.append(heading,meta);const form=document.createElement('form');form.className='profile-admin-publication-form';const currency=item.price_currency||'USD';const field=(labelText,name,value,multiline=false)=>{const label=document.createElement('label');label.textContent=t(labelText);const input=multiline?document.createElement('textarea'):document.createElement('input');input.name=name;if(multiline)input.rows=name==='brief'?4:3;if(name==='initialPriceUsd'||name==='finalPriceUsd'){input.type='number';input.min=name==='initialPriceUsd'?'0':'0.01';input.step='0.01';input.required=true}if(name==='title'||name==='brief')input.required=true;input.value=value??'';label.append(input);form.append(label);return input};field('Título','title',item.title);field('Nombre público','chosenName',item.chosen_name);field('Descripción','brief',item.brief,true);field(`Precio inicial (${currency})`,'initialPriceUsd',item.initial_price);field(`Precio final (${currency})`,'finalPriceUsd',item.final_price);field('Motivo del cambio de precio','priceChangeReason',item.price_change_reason,true);field('Video del proceso (URL HTTPS)','processVideo',item.process_video_url);let finalImages=[],referenceImages=[];try{finalImages=JSON.parse(item.final_images_json||'[]')}catch{}try{referenceImages=JSON.parse(item.reference_images_json||'[]')}catch{}field('Imágenes finales (una URL por línea)','finalImages',finalImages.join('\n'),true);field('Referencias (una URL por línea)','referenceImages',referenceImages.join('\n'),true);const actions=document.createElement('div');actions.className='profile-admin-publication-actions';const save=document.createElement('button');save.type='submit';save.textContent=t('Guardar cambios');const remove=document.createElement('button');remove.type='button';remove.className='profile-admin-delete';remove.textContent=t('Borrar publicación');const status=document.createElement('small');status.setAttribute('role','status');actions.append(save,remove);form.append(actions,status);form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;const lines=name=>form.elements[name].value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);try{await api(`admin/commissions/${encodeURIComponent(item.id)}`,{method:'PATCH',body:JSON.stringify({title:form.elements.title.value,chosenName:form.elements.chosenName.value,brief:form.elements.brief.value,initialPriceUsd:Number(form.elements.initialPriceUsd.value),finalPriceUsd:Number(form.elements.finalPriceUsd.value),priceChangeReason:form.elements.priceChangeReason.value,processVideo:form.elements.processVideo.value,finalImages:lines('finalImages'),referenceImages:lines('referenceImages')})});status.textContent=t('Cambios guardados.');await loadAdminPublications()}catch(error){status.textContent=t(error.message);save.disabled=false}});remove.addEventListener('click',async()=>{if(!window.confirm(t('¿Borrar esta publicación de Comisiones hechas? El pedido seguirá en el historial.')))return;remove.disabled=true;try{await api(`admin/commissions/${encodeURIComponent(item.id)}`,{method:'DELETE'});await loadAdminPublications()}catch(error){status.textContent=t(error.message);remove.disabled=false}});card.append(form);root.append(card)})}
  async function adminPatch(orderId,body,card){const status=document.createElement('small');status.setAttribute('role','status');card.append(status);try{await api(`admin/orders/${encodeURIComponent(orderId)}`,{method:'PATCH',body:JSON.stringify(body)});status.textContent=t('Actualizado.');await loadOrders()}catch(error){status.textContent=t(error.message)}}
  async function adminPublish(orderId,body,card){const status=card.querySelector('.profile-admin-publish [role=status]');try{await api(`admin/orders/${encodeURIComponent(orderId)}/publish`,{method:'POST',body:JSON.stringify(body)});status.textContent=t('Publicado.');await loadOrders()}catch(error){status.textContent=t(error.message)}}
  function setSignedIn(user) {
    authVersion += 1;
    authenticatedUser = user;
    const signed = Boolean(user);
    if(signed&&continueAfterOrderLogin())return;
    if(signed)authRedirectMessage='';
    document.querySelectorAll('[data-provider],#profile-auth-hint').forEach(control=>control.hidden=signed);
    byId('profile-signout').hidden = !signed;
    byId('profile-new-order').hidden = !signed;
    byId('profile-email').textContent = signed ? user.email : '';
    byId('profile-admin').hidden=!(signed&&user.isAdmin);
    if (!signed || !user.isAdmin) { byId('profile-admin-orders').replaceChildren(); byId('profile-admin-publications').replaceChildren(); }
    if(signed&&user.isAdmin)loadCommissionSettings();
    if (signed) { if (!nameInput.value) nameInput.value = user.name || ''; setMode(`${t('Sesión iniciada como')} ${user.name || user.email}. ${t('Los pedidos se consultan en el servidor.')}`); loadProfile(); loadOrders(); loadPaymentProviders(); }
    else { setMode(authRedirectMessage||'Aún no iniciaste sesión. Iniciá con Google, Discord o Twitter para vincular tus pedidos, tickets y reseñas.'); showOrders([]); }
    updateAvatar(user);
  }
  async function loadCommissionSettings(){const button=byId('profile-commission-toggle'),state=byId('profile-commission-state'),status=byId('profile-commission-status');button.disabled=true;try{const result=await api('admin/commission-status');state.textContent=result.open?'Estado: comisiones abiertas':'Estado: comisiones cerradas';button.textContent=result.open?'Cerrar comisiones':'Abrir comisiones';button.dataset.open=String(result.open);button.disabled=false;status.textContent=''}catch(error){state.textContent='Estado: no disponible';button.textContent='No se pudo cargar';status.textContent=t(error.message)}}
  byId('profile-commission-toggle').addEventListener('click',async()=>{const button=byId('profile-commission-toggle'),status=byId('profile-commission-status'),open=button.dataset.open!=='true';button.disabled=true;status.textContent=t('Guardando estado…');try{const result=await api('admin/commission-status',{method:'PUT',body:JSON.stringify({open})});button.dataset.open=String(result.open);byId('profile-commission-state').textContent=result.open?'Estado: comisiones abiertas':'Estado: comisiones cerradas';button.textContent=result.open?'Cerrar comisiones':'Abrir comisiones';status.textContent=t(result.open?'Las comisiones quedaron abiertas.':'Las comisiones quedaron cerradas.');button.disabled=false}catch(error){status.textContent=t(error.message);button.disabled=false}});
  async function loadProfile(){try{const result=await api('profile');if(result.profile){nameInput.value=result.profile.name||'';authenticatedUser={...authenticatedUser,name:result.profile.name,picture:result.profile.picture||authenticatedUser.picture};updateAvatar();}}catch(error){byId('profile-save-status').textContent=`${t('No se pudo cargar el perfil:')} ${t(error.message)}`}}
  async function setupOAuthProviders() {
    const links=[...document.querySelectorAll('[data-provider]')];
    const returnPath=['/perfil-comisiones.html','/mis-pedidos.html','/tickets-soporte.html'].includes(location.pathname)?location.pathname:'/perfil-comisiones.html';
    links.forEach(link=>{link.href=`/api/auth/${link.dataset.provider}/start?return=${encodeURIComponent(returnPath)}`});
    links.forEach(link=>link.addEventListener('click',event=>{if(link.getAttribute('aria-disabled')==='true')event.preventDefault()}));
    const names={google:'Google',discord:'Discord',x:'Twitter'};
    const missing={google:'Configurá GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Cloudflare Pages y registrá /api/auth/google/callback en Google.',discord:'Configurá DISCORD_CLIENT_ID y DISCORD_CLIENT_SECRET en Cloudflare y registrá /api/auth/discord/callback en Discord.',x:'Configurá X_CLIENT_ID y X_CLIENT_SECRET en Cloudflare y registrá /api/auth/x/callback en X.'};
    try {
      const available=await api('auth/providers');
      for(const link of links){const provider=link.dataset.provider,enabled=Boolean(available[provider]),label=names[provider];link.setAttribute('aria-disabled',String(!enabled));link.title=enabled?'':t(missing[provider]);link.querySelector('.profile-provider-label').textContent=enabled?`${t('Iniciar con')} ${label}`:`${label} · ${t('no configurado')}`;}
      if(!Object.values(available).some(Boolean)&&!authenticatedUser){authRedirectMessage=t('Todavía no hay accesos configurados. En Cloudflare hacen falta D1, SESSION_SECRET y las credenciales OAuth del proveedor.');byId('profile-auth-message').textContent=authRedirectMessage;}
    } catch {
      for(const link of links){const provider=link.dataset.provider;link.setAttribute('aria-disabled','true');link.title=t('El sitio no pudo contactar al servidor de acceso.');link.querySelector('.profile-provider-label').textContent=`${names[provider]} · ${t('no disponible')}`;}
      if(!authenticatedUser){authRedirectMessage=location.protocol==='file:'?t('Esta vista abierta como archivo no puede iniciar sesión. Abrí el sitio publicado en Cloudflare Pages.'):t('No se pudo contactar al servidor de acceso. Revisá que Cloudflare Pages Functions y D1 estén configurados.');byId('profile-auth-message').textContent=authRedirectMessage;}
    }
  }
 async function createOrder(event) {
    event.preventDefault(); const status = byId('profile-order-status'); const submit = byId('profile-order-submit');
    const selected = Object.entries(cart()).map(([id, quantity]) => ({ id:id === 'saludo' ? 'un-saludo' : id, quantity:Math.floor(Number(quantity) || 0) })).filter(item => item.quantity > 0);
    if (!selected.length) { status.textContent = t('Primero agregá opciones desde el catálogo de comisiones.'); return; }
    submit.disabled=true; status.textContent=t('Enviando pedido…');
    try {
      const saved=localProfile();
      const { order, email } = await api('orders', { method:'POST', body:JSON.stringify({ items:selected, contact:byId('profile-contact').value, details:byId('profile-details').value, displayName:nameInput.value.trim() || saved.name || authenticatedUser?.name || '' }) });
      try { localStorage.removeItem(CART_KEY); } catch { }
      renderCartSummary(); const notices=[email?.admin==='sent'?'correo':null,email?.discord==='sent'?'Discord':null].filter(Boolean);const notifyCopy=notices.length?`${t('Aviso enviado a NNytro por')} ${notices.join(' y ')}.`:t('No pudimos avisarle a NNytro, pero el pedido quedó guardado en tu perfil.');const customerCopy=email?.customer==='sent'?t('Te enviamos la confirmación por correo.'):t('No salió el correo de confirmación; tu pedido quedó guardado.');status.textContent=`${t('Pedido enviado para revisión. Código')} ${String(order.id).slice(0,8).toUpperCase()}. ${notifyCopy} ${customerCopy}`; byId('profile-order-form').reset(); await loadOrders();
    } catch(error) { status.textContent=t(error.message); }
    finally { submit.disabled=false; }
  }
  function renderProfileLocal() {
    const local=localProfile(); nameInput.value=typeof local.name==='string'?local.name.slice(0,48):''; profilePhoto=typeof local.photo==='string'&&local.photo.startsWith('data:image/')?local.photo:''; updateAvatar(); renderCartSummary();
  }
  renderProfileLocal();
  nameInput.addEventListener('input', () => updateAvatar());
  photoInput.addEventListener('change', () => {
    const file=photoInput.files?.[0]; if(!file)return;
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>8*1024*1024){photoInput.value='';byId('profile-save-status').textContent=t('Elegí PNG, JPG o WebP de hasta 8 MB.');return;}
    createImageBitmap(file,{resizeWidth:1024,resizeHeight:1024,resizeQuality:'high',resizeMode:'contain'}).then(bitmap=>{const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();canvas.toBlob(blob=>{if(!blob){byId('profile-save-status').textContent=t('No se pudo preparar la imagen.');return;}const reader=new FileReader();reader.addEventListener('load',()=>{profilePhoto=typeof reader.result==='string'?reader.result:'';updateAvatar();});reader.readAsDataURL(blob);},'image/jpeg',.82)}).catch(()=>{photoInput.value='';byId('profile-save-status').textContent=t('No se pudo abrir esa imagen.');});
  });
  byId('profile-form').addEventListener('submit', async event => { event.preventDefault(); const status=byId('profile-save-status');const displayName=nameInput.value.trim().slice(0,48);if(authenticatedUser){try{let avatarUrl=authenticatedUser.picture||'';const file=photoInput.files?.[0];if(file){const form=new FormData();form.append('file',file,file.name);const uploaded=await api('profile/avatar',{method:'POST',body:form});avatarUrl=uploaded.avatarUrl;}const result=await api('profile',{method:'PATCH',body:JSON.stringify({displayName,avatarUrl})});authenticatedUser={...authenticatedUser,name:result.profile.name,picture:result.profile.picture||authenticatedUser.picture};profilePhoto='';photoInput.value='';status.textContent=t(file?'Perfil y foto guardados en tu cuenta.':'Nombre guardado en tu cuenta.');updateAvatar();}catch(error){status.textContent=`${t('No se pudo guardar:')} ${t(error.message)}`}}else{let ok=false;try{localStorage.setItem(PROFILE_KEY,JSON.stringify({name:displayName,photo:profilePhoto}));ok=true}catch{}status.textContent=t(ok?'Guardado como preferencia local. Para sincronizarlo, iniciá sesión.':'No se pudo guardar en este navegador.');updateAvatar();} });
  byId('profile-clear-photo').addEventListener('click',()=>{profilePhoto='';photoInput.value='';updateAvatar();});
  byId('profile-order-form').addEventListener('submit',createOrder);
  byId('profile-signout').addEventListener('click',async()=>{authVersion+=1;try{await api('auth/me',{method:'DELETE'});}catch{}setSignedIn(null);});
  setupOAuthProviders();
  const loginParams=new URLSearchParams(location.search);
  if(loginParams.get('login')==='failed'){const provider={google:'Google',x:'Twitter',discord:'Discord'}[loginParams.get('provider')]||'el proveedor';authRedirectMessage=t('No se pudo iniciar sesión con')+' '+provider+'. '+t('Revisá las credenciales OAuth, el correo verificado y la URL de retorno.');byId('profile-auth-message').textContent=authRedirectMessage;}
  if(loginParams.has('login')){loginParams.delete('login');loginParams.delete('provider');const clean=location.pathname+(loginParams.size?'?'+loginParams.toString():'')+location.hash;history.replaceState(null,'',clean)}
  (async()=>{const version=authVersion;try{const result=await api('auth/me');if(version===authVersion)setSignedIn(result.user);}catch{if(version===authVersion)setSignedIn(null);}})();
  handlePaymentReturn();
  document.addEventListener('nnytro:language-applied', () => {
    const snapshot = captureDynamicFormState();
    renderCartSummary();
    if (authenticatedUser) byId('profile-auth-message').textContent = `${t('Sesión iniciada como')} ${authenticatedUser.name || authenticatedUser.email}. ${t('Los pedidos se consultan en el servidor.')}`;
    else byId('profile-auth-message').textContent = authRedirectMessage || t('Aún no iniciaste sesión. Iniciá con Google, Discord o Twitter para vincular tus pedidos, tickets y reseñas.');
    if (cachedOrders.length) {
      showOrders(cachedOrders);
      if (authenticatedUser?.isAdmin) renderAdminOrders(cachedOrders);
      restoreDynamicFormState(snapshot);
    }
  });
  window.addEventListener('storage',event=>{if(event.key===CART_KEY)renderCartSummary();if(event.key===PROFILE_KEY)renderProfileLocal();});
})();
