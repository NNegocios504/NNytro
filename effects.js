(() => {
  const root = document.documentElement;
  root.classList.add('xp-cursor');

  // Keep this in sync with index.html so the tuning screen returns once per site revision.
  const siteBuildVersion = '2026-10-15-13';
  let siteRevisionNeedsTuning = false;
  try {
    siteRevisionNeedsTuning = localStorage.getItem('nnytro-site-loader-version') !== siteBuildVersion;
    localStorage.setItem('nnytro-site-loader-version', siteBuildVersion);
  } catch { siteRevisionNeedsTuning = true; }

  // The menu warms every page shell; a direct page visit also gets the brief revision screen when needed.
  const isHome = document.querySelector('.home-page') !== null;
  let pageLoader = document.querySelector('.site-loader');
  if (!pageLoader && siteRevisionNeedsTuning) {
    pageLoader = document.createElement('div');
    pageLoader.className = 'site-loader site-loader--revision';
    pageLoader.setAttribute('role', 'status');
    pageLoader.setAttribute('aria-live', 'polite');
    pageLoader.setAttribute('aria-label', 'Cargando página');
    pageLoader.innerHTML = '<div class="site-loader-screen" aria-hidden="true"><span class="site-loader-orbit"></span><img class="site-loader-nutria" src="./assets/nutria-loading.png" alt=""></div><span class="site-loader-label">Sintonizando</span><span class="site-loader-progress" role="progressbar" aria-label="Actualizando sitio" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i style="width:100%"></i></span>';
    document.body.append(pageLoader);
    setTimeout(() => {
      pageLoader.classList.add('site-loader--leaving');
      setTimeout(() => pageLoader?.remove(), 1250);
    }, 500);
  }
  const firstMenuVisit = isHome && !root.classList.contains('nnytro-menu-return');
  const progressBar = pageLoader?.querySelector('.site-loader-progress');
  const progressFill = progressBar?.querySelector('i');
  const setLoadProgress = (value) => {
    if (!progressBar || !progressFill) return;
    const percent = Math.max(0, Math.min(100, value));
    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', String(Math.round(percent)));
  };
  const warmSections = async () => {
    const routes = [...document.querySelectorAll('.home-link')].map((link) => link.href);
    const retainedVideos = [];
    const warmResource = async (url) => {
      try {
        const response = await fetch(url, { cache: 'force-cache', credentials: 'same-origin' });
        if (!response.ok) return '';
        if (response.headers.get('content-type')?.includes('text/css')) return await response.text();
        await response.arrayBuffer();
        return '';
      } catch { /* A failed resource should not block entry. */ }
    };
    const warmVideoMetadata = (url) => new Promise((resolve) => {
      const video = document.createElement('video');
      retainedVideos.push(video);
      video.preload = 'auto';
      video.muted = true;
      const finish = () => { video.pause(); resolve(); };
      video.addEventListener('loadeddata', finish, { once: true });
      video.addEventListener('error', finish, { once: true });
      setTimeout(finish, 8000);
      video.src = url;
      video.load();
    });

    let routesLoaded = 0;
    const documents = await Promise.all(routes.map(async (route) => {
      try {
        const response = await fetch(route, { cache: 'force-cache', credentials: 'same-origin' });
        routesLoaded += 1;
        setLoadProgress((routesLoaded / routes.length) * 30);
        if (!response.ok) return null;
        return { route, html: await response.text() };
      } catch {
        routesLoaded += 1;
        setLoadProgress((routesLoaded / routes.length) * 30);
        return null;
      }
    }));

    const assets = new Set();
    const videos = new Set();
    documents.filter(Boolean).forEach(({ route, html }) => {
      const page = new DOMParser().parseFromString(html, 'text/html');
      page.querySelectorAll('link[rel="stylesheet"][href], script[src], img[src], img[data-src], video[poster]').forEach((asset) => {
        const value = asset.tagName === 'LINK' ? asset.getAttribute('href') : asset.tagName === 'VIDEO' || asset.hasAttribute('poster') ? asset.getAttribute('poster') : asset.getAttribute('src') || asset.getAttribute('data-src');
        if (!value) return;
        const url = new URL(value, route);
        if (url.origin === location.origin) assets.add(url.href);
      });
      page.querySelectorAll('video source[src]').forEach((source) => {
        const url = new URL(source.getAttribute('src'), route);
        if (url.origin === location.origin) videos.add(url.href);
      });
    });

    const videoWarmup = Promise.all([...videos].map(warmVideoMetadata));
    let assetsLoaded = 0;
    const pendingAssets = [...assets];
    let nextAsset = 0;
    const warmNextAsset = async () => {
      while (nextAsset < pendingAssets.length) {
        const url = pendingAssets[nextAsset++];
        const css = await warmResource(url);
        if (css) {
          [...css.matchAll(/url\(\s*(?:(['"])(.*?)\1|([^)]*))\s*\)/gi)].forEach((match) => {
            const value = (match[2] || match[3] || '').trim();
            if (!value || value.startsWith('data:') || value.startsWith('#')) return;
            try {
              const nested = new URL(value, url);
              if (nested.origin === location.origin && !assets.has(nested.href)) {
                assets.add(nested.href);
                pendingAssets.push(nested.href);
              }
            } catch { /* Ignore malformed CSS URLs. */ }
          });
        }
        assetsLoaded += 1;
        setLoadProgress(30 + (assetsLoaded / Math.max(1, pendingAssets.length)) * 55);
      }
    };
    await Promise.all([warmNextAsset(), warmNextAsset(), warmNextAsset(), warmNextAsset()]);
    try {
      const response = await fetch('./portfolio-covers.json', { cache: 'force-cache', credentials: 'same-origin' });
      const coverPaths = response.ok ? await response.json() : [];
      let nextCover = 0;
      let coversLoaded = 0;
      const warmNextCover = async () => {
        while (nextCover < coverPaths.length) {
          const url = new URL(coverPaths[nextCover++], location.href).href;
          await warmResource(url);
          coversLoaded += 1;
          setLoadProgress(65 + (coversLoaded / Math.max(1, coverPaths.length)) * 35);
        }
      };
      if (!navigator.connection?.saveData) await Promise.all([warmNextCover(), warmNextCover()]);
    } catch { /* Card covers can load normally when the portfolio opens. */ }
    await videoWarmup;
    setLoadProgress(100);
  };
  // Warm a section immediately when the pointer or keyboard focus shows intent to open it.
  const hoverWarmups = new Map();
  const warmPageOnIntent = (route) => {
    if (hoverWarmups.has(route)) return hoverWarmups.get(route);
    const warmup = (async () => {
      const warmResource = async (url) => {
        try {
          const response = await fetch(url, { cache: 'force-cache', credentials: 'same-origin' });
          if (!response.ok) return '';
          if (response.headers.get('content-type')?.includes('text/css')) return await response.text();
          await response.arrayBuffer();
        } catch { /* Navigation still works if a resource cannot be warmed. */ }
        return '';
      };
      try {
        const response = await fetch(route, { cache: 'force-cache', credentials: 'same-origin' });
        if (!response.ok) return;
        const page = new DOMParser().parseFromString(await response.text(), 'text/html');
        const assets = new Set();
        page.querySelectorAll('link[rel="stylesheet"][href], script[src], img[src], img[data-src], video[poster]').forEach((asset) => {
          const value = asset.tagName === 'LINK' ? asset.getAttribute('href') : asset.tagName === 'VIDEO' || asset.hasAttribute('poster') ? asset.getAttribute('poster') : asset.getAttribute('src') || asset.getAttribute('data-src');
          if (!value) return;
          const url = new URL(value, route);
          if (url.origin === location.origin) assets.add(url.href);
        });
        const pending = [...assets];
        let next = 0;
        const warmNext = async () => {
          while (next < pending.length) {
            const url = pending[next++];
            const css = await warmResource(url);
            if (!css) continue;
            [...css.matchAll(/url\(\s*(?:(['"])(.*?)\1|([^)]*))\s*\)/gi)].forEach((match) => {
              const value = (match[2] || match[3] || '').trim();
              if (!value || value.startsWith('data:') || value.startsWith('#')) return;
              try {
                const nested = new URL(value, url);
                if (nested.origin === location.origin && !assets.has(nested.href)) {
                  assets.add(nested.href);
                  pending.push(nested.href);
                }
              } catch { /* Ignore malformed CSS URLs. */ }
            });
          }
        };
        const jobs = [warmNext(), warmNext(), warmNext(), warmNext()];
        if (new URL(route).pathname.endsWith('/galeria.html') && !navigator.connection?.saveData) {
          jobs.push((async () => {
            try {
              const manifest = await fetch(new URL('./portfolio-covers.json', location.href), { cache: 'force-cache', credentials: 'same-origin' });
              if (!manifest.ok) return;
              const covers = await manifest.json();
              let index = 0;
              const warmCovers = async () => {
                while (index < covers.length) {
                  const cover = new URL(covers[index++], location.href);
                  if (cover.origin === location.origin) await warmResource(cover.href);
                }
              };
              await Promise.all([warmCovers(), warmCovers()]);
            } catch { /* Covers can load normally when the portfolio opens. */ }
          })());
        }
        await Promise.all(jobs);
      } catch { /* The actual navigation remains available if preloading fails. */ }
    })();
    hoverWarmups.set(route, warmup);
    return warmup;
  };
  const warmButtonTarget = (event) => {
    const link = event.target.closest?.('.home-link');
    if (link) warmPageOnIntent(link.href);
  };
  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'mouse') warmButtonTarget(event);
  }, { passive: true });
  document.addEventListener('focusin', warmButtonTarget);

  // Keep the first viewport responsive; preload the remaining sections after it has settled.
  const pageWarmup = firstMenuVisit ? new Promise((resolve) => {
    const startWarmup = () => setTimeout(() => warmSections().finally(resolve), 6500);
    if (document.readyState === 'complete') startWarmup();
    else window.addEventListener('load', startWarmup, { once: true });
  }) : Promise.resolve();

  if (pageLoader && !pageLoader.classList.contains('site-loader--revision')) {
    if (!firstMenuVisit) {
      pageLoader.remove();
    } else {
      const startedAt = performance.now();
      const activeVideo = document.querySelector('.home-background-video');
      const activeImage = document.querySelector('.home-tv-frame');
      const criticalReady = Promise.all([
        activeVideo?.readyState >= 2 ? Promise.resolve() : new Promise((resolve) => {
          if (!activeVideo) return resolve();
          activeVideo.addEventListener('loadeddata', resolve, { once: true });
          activeVideo.addEventListener('error', resolve, { once: true });
        }),
        activeImage?.complete ? Promise.resolve() : new Promise((resolve) => {
          if (!activeImage) return resolve();
          activeImage.addEventListener('load', resolve, { once: true });
          activeImage.addEventListener('error', resolve, { once: true });
        })
      ]);
      Promise.race([criticalReady, new Promise((resolve) => setTimeout(resolve, 2200))])
        .then(() => new Promise((resolve) => setTimeout(resolve, Math.max(0, 1350 - (performance.now() - startedAt)))))
        .then(() => {
          requestAnimationFrame(() => requestAnimationFrame(() => {
            pageLoader.classList.add('site-loader--leaving');
            document.body.removeAttribute('aria-busy');
            pageLoader.addEventListener('transitionend', (event) => {
              if (event.propertyName === 'opacity') pageLoader.remove();
            }, { once: true });
            setTimeout(() => pageLoader.remove(), 1460);
          }));
        });
    }
  }
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  document.querySelectorAll('[data-analog-tv]').forEach((screen) => {
    if (!reduceMotion) screen.classList.add('analog-tv-jitter');
  });

  // Sound starts enabled on first visit; the visitor can mute it and keep that choice.
  let enabled = true;
  try { const savedSoundChoice=localStorage.getItem('portfolio-sound-enabled');if(savedSoundChoice!==null)enabled=savedSoundChoice==='true'; } catch { /* Storage can be disabled. */ }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'site-sound-toggle';
  toggle.dataset.enabled = String(enabled);
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.setAttribute('aria-label', `${enabled ? 'Desactivar' : 'Activar'} sonidos de la página`);
  toggle.title = enabled ? 'Desactivar sonidos' : 'Activar sonidos';
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="sound-speaker" d="M3 9v6h4l5 4V5L7 9H3Z"/><path class="sound-wave" d="M15 9a5 5 0 0 1 0 6"/><path class="sound-wave" d="M17.8 6.5a8.5 8.5 0 0 1 0 11"/><path class="sound-muted-mark" d="m16 9 5 6m0-6-5 6"/></svg>';
  const profileToggle = document.createElement('a');
  profileToggle.className = 'site-profile-toggle';
  profileToggle.href = './perfil-comisiones.html';
  profileToggle.setAttribute('aria-label', 'Tu perfil');
  profileToggle.title = 'Tu perfil';
  profileToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/></svg>';
  const accountTools=document.createElement('div');accountTools.className='site-account-tools';
  const notificationToggle=document.createElement('button');notificationToggle.type='button';notificationToggle.className='site-notification-toggle';notificationToggle.setAttribute('aria-label','Notificaciones');notificationToggle.setAttribute('aria-expanded','false');notificationToggle.setAttribute('aria-controls','site-notifications');
  notificationToggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span class="site-notification-badge" hidden></span>';
  const notificationPanel=document.createElement('section');notificationPanel.className='site-notifications';notificationPanel.id='site-notifications';notificationPanel.setAttribute('aria-label','Notificaciones');notificationPanel.hidden=true;
  notificationPanel.innerHTML='<header><strong>Notificaciones</strong><button type="button" class="site-notifications-close" aria-label="Cerrar notificaciones">×</button></header><div class="site-notification-list" aria-live="polite"></div>';
  accountTools.append(notificationToggle,profileToggle);
  const editorToggle=document.createElement('button');editorToggle.type='button';editorToggle.className='site-editor-toggle';editorToggle.setAttribute('aria-label','Activar edición de página');editorToggle.title='Editar esta página';editorToggle.textContent='✎';editorToggle.hidden=true;
  profileToggle.after(editorToggle);
  fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{const user=data?.user;editorToggle.hidden=!(user?.isAdmin&&String(user.email||'').toLowerCase()==='nnytro.online@gmail.com');const link=document.createElement('link');link.rel='stylesheet';link.href='./inline-page-editor.css?v=inline-editor-news-1';document.head.append(link);const script=document.createElement('script');script.src='./inline-page-editor.js?v=inline-editor-news-1';document.body.append(script)}).catch(()=>{});
  const isMenuPage = /(?:^|\/)index(?:\.html)?\/?$/i.test(location.pathname);
  (isMenuPage ? document.body : document.querySelector(".unified-site-actions") || document.querySelector(".commission-header-actions") || document.querySelector(".unified-site-header") || document.body).append(accountTools);
  document.body.append(notificationPanel);
  const notificationBadge=notificationToggle.querySelector('.site-notification-badge'),notificationList=notificationPanel.querySelector('.site-notification-list');
  const notificationT=value=>window.NNytroI18n?.t(value)||value;
  const pendingCartCount=()=>{try{const cart=JSON.parse(localStorage.getItem('nnytro-commission-cart-v1')||'{}');return Object.values(cart).reduce((n,q)=>n+Math.max(0,Number(q)||0),0)}catch{return 0}};
  let notificationItems=[],notificationNewsItems=[],notificationUser=null,notificationBusy=false,notificationInitialized=false,notificationAudio=null;
  function unlockNotificationSound(){if(notificationAudio)return;const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;try{notificationAudio=new AudioContext();notificationAudio.resume().catch(()=>{})}catch{notificationAudio=null}}
  function playNotificationSound(){if(!notificationAudio||notificationAudio.state!=='running')return;try{const now=notificationAudio.currentTime,gain=notificationAudio.createGain(),osc=notificationAudio.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(880,now);osc.frequency.setValueAtTime(1174,now+.11);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.12,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+.3);osc.connect(gain);gain.connect(notificationAudio.destination);osc.start(now);osc.stop(now+.31)}catch{}}
  document.addEventListener('pointerdown',unlockNotificationSound,{once:true});document.addEventListener('keydown',unlockNotificationSound,{once:true});
  const seenKey=()=>`nnytro-notifications-seen-v1:${notificationUser?.sub||'guest'}`;
  function renderNotifications(){
    notificationList.replaceChildren();
    const cartCount=pendingCartCount();
    if(cartCount){const item=document.createElement('a');item.className='site-notification-item';item.href='./comisiones.html#opciones';const title=document.createElement('strong'),detail=document.createElement('span');title.textContent=notificationT('Tenés un carrito pendiente');detail.textContent=notificationT(cartCount===1?'Hay un elemento en tu carrito; seguí con tu pedido.':'Hay elementos en tu carrito; seguí con tu pedido.');item.append(title,detail);notificationList.append(item)}
    notificationNewsItems.forEach(entry=>{const item=document.createElement('a');item.className='site-notification-item site-notification-news';item.href=entry.href;const title=document.createElement('strong'),detail=document.createElement('span');title.textContent=entry.title;detail.textContent=entry.body||notificationT('Hay una nueva publicación en el inicio.');item.append(title,detail);notificationList.append(item)});
    notificationItems.forEach(entry=>{const item=document.createElement('a');item.className='site-notification-item';const published=entry.type==='event'&&entry.event_type==='commission_published',support=Boolean(entry.ticket_id);item.href=published?'./comisiones-finalizadas.html':support?`./tickets-soporte.html?ticket=${encodeURIComponent(entry.ticket_id)}`:entry.type==='message'?'./tickets-soporte.html':'./mis-pedidos.html';const title=document.createElement('strong'),detail=document.createElement('span'),code=document.createElement('small');title.textContent=published?notificationT('Tu comisión ya está publicada'):entry.type==='message'?notificationT('Nuevo mensaje en un ticket de soporte'):notificationT('Hay una novedad en tu pedido');detail.textContent=published?notificationT('Ya podés ver la publicación y dejar una reseña con estrellas.'):entry.type==='message'?entry.body:notificationT('El estado del pedido cambió. Entrá a Mis pedidos para ver los detalles.');code.textContent=support?`T-${String(entry.ticket_id).slice(0,8).toUpperCase()}`:`NN-${String(entry.order_id||'').slice(0,8).toUpperCase()}`;item.append(title,detail,code);notificationList.append(item)});
    if(!notificationUser){const login=document.createElement('a');login.className='site-notification-login';login.href='./perfil-comisiones.html';login.textContent=notificationT('Iniciá sesión para ver las novedades de tus pedidos.');notificationList.append(login)}
    let seenNews=[];try{seenNews=JSON.parse(localStorage.getItem(`nnytro-news-seen-v1:${notificationUser?.sub||'guest'}`)||'[]')}catch{}const unreadNews=notificationNewsItems.filter(entry=>!seenNews.includes(entry.id)).length;const unread=notificationItems.length+(cartCount?1:0)+unreadNews;notificationBadge.hidden=!unread;notificationBadge.textContent=unread>99?'99+':String(unread);notificationToggle.setAttribute('aria-label',`${notificationT('Notificaciones')}${unread?`, ${unread} ${notificationT('sin leer')}`:''}`);
  }
  async function refreshNotifications(){
    if(notificationBusy||document.visibilityState==='hidden')return;notificationBusy=true;
    try{try{const newsResponse=await fetch('/api/news',{credentials:'same-origin',cache:'no-store'});if(newsResponse.ok){const newsData=await newsResponse.json();notificationNewsItems=Array.isArray(newsData.items)?newsData.items:[]}}catch{}const auth=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});const me=auth.ok?await auth.json():{user:null},nextUser=me.user||null;if(nextUser?.sub!==notificationUser?.sub){notificationItems=[];notificationInitialized=false}notificationUser=nextUser;
      if(notificationUser){let since='';try{since=localStorage.getItem(seenKey())||''}catch{}if(!since)since=new Date(Date.now()-7*86400000).toISOString();const response=await fetch(`/api/notifications?since=${encodeURIComponent(since)}`,{credentials:'same-origin',cache:'no-store'});if(response.ok){const data=await response.json(),incoming=[...(data.messages||[]).map(x=>({...x,type:'message'})),...(data.events||[]).map(x=>({...x,type:'event'}))];const known=new Set(notificationItems.map(x=>x.id)),fresh=incoming.filter(x=>!known.has(x.id));if(notificationInitialized&&fresh.length)playNotificationSound();notificationItems.push(...fresh);notificationItems.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));notificationItems=notificationItems.slice(0,30);notificationInitialized=true}}else notificationInitialized=false;
    }catch{}finally{notificationBusy=false;renderNotifications()}
  }
  function toggleNotifications(open){notificationPanel.hidden=!open;notificationToggle.setAttribute('aria-expanded',String(open));if(open){try{localStorage.setItem(seenKey(),new Date().toISOString());localStorage.setItem(`nnytro-news-seen-v1:${notificationUser?.sub||'guest'}`,JSON.stringify(notificationNewsItems.map(entry=>entry.id)))}catch{}notificationItems=[];renderNotifications();void refreshNotifications()}notificationToggle.focus()}
  notificationToggle.addEventListener('click',()=>toggleNotifications(notificationPanel.hidden));notificationPanel.querySelector('.site-notifications-close').addEventListener('click',()=>toggleNotifications(false));
  notificationPanel.addEventListener('click',event=>{if(event.target.closest('a'))toggleNotifications(false)});
  document.addEventListener('nnytro:cart-change',renderNotifications);window.addEventListener('storage',renderNotifications);document.addEventListener('nnytro:language-applied',renderNotifications);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshNotifications()});
  renderNotifications();void refreshNotifications();setInterval(()=>void refreshNotifications(),10000);
  document.body.append(toggle);

  // The currency selector is available only on the commissions page.
  const currencyOptions = [
    ['USD','Dólar estadounidense','US dollar','Dólar americano'],['ARS','Peso argentino','Argentine peso','Peso argentino'],['BRL','Real brasileño','Brazilian real','Real brasileiro'],['EUR','Euro','Euro','Euro'],['MXN','Peso mexicano','Mexican peso','Peso mexicano'],['CLP','Peso chileno','Chilean peso','Peso chileno'],['COP','Peso colombiano','Colombian peso','Peso colombiano'],['PEN','Sol peruano','Peruvian sol','Sol peruano'],['UYU','Peso uruguayo','Uruguayan peso','Peso uruguaio'],['GBP','Libra esterlina','British pound','Libra esterlina'],['CAD','Dólar canadiense','Canadian dollar','Dólar canadense'],['AUD','Dólar australiano','Australian dollar','Dólar australiano'],['JPY','Yen japonés','Japanese yen','Iene japonês'],['CHF','Franco suizo','Swiss franc','Franco suíço'],['CNY','Yuan chino','Chinese yuan','Yuan chinês'],['INR','Rupia india','Indian rupee','Rupia indiana'],['NZD','Dólar neozelandés','New Zealand dollar','Dólar neozelandês'],['ZAR','Rand sudafricano','South African rand','Rand sul-africano'],['SEK','Corona sueca','Swedish krona','Coroa sueca'],['NOK','Corona noruega','Norwegian krone','Coroa norueguesa'],['DKK','Corona danesa','Danish krone','Coroa dinamarquesa'],['PLN','Zloty polaco','Polish złoty','Złoty polonês'],['TRY','Lira turca','Turkish lira','Lira turca']
  ];
  const currencyStorageKey = 'nnytro-currency';
  const regionToCurrency = { AR:'ARS', BR:'BRL', US:'USD', GB:'GBP', MX:'MXN', CL:'CLP', CO:'COP', PE:'PEN', UY:'UYU', CA:'CAD', AU:'AUD', JP:'JPY', CH:'CHF', CN:'CNY', IN:'INR', NZ:'NZD', ZA:'ZAR', SE:'SEK', NO:'NOK', DK:'DKK', PL:'PLN', TR:'TRY', AT:'EUR', BE:'EUR', CY:'EUR', DE:'EUR', EE:'EUR', ES:'EUR', FI:'EUR', FR:'EUR', GR:'EUR', HR:'EUR', IE:'EUR', IT:'EUR', LT:'EUR', LU:'EUR', LV:'EUR', MT:'EUR', NL:'EUR', PT:'EUR', SI:'EUR', SK:'EUR' };
  const detectCurrency = () => {
    for (const locale of (navigator.languages || [navigator.language]).filter(Boolean)) {
      try { const region = new Intl.Locale(locale).region; if (regionToCurrency[region]) return regionToCurrency[region]; } catch { /* Ignore malformed browser locales. */ }
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (timezone.startsWith('America/Argentina/')) return 'ARS';
    if (/^America\/(Sao_Paulo|Fortaleza|Recife|Bahia|Belem|Manaus|Porto_Velho)/.test(timezone)) return 'BRL';
    if (/^America\/(Mexico_City|Monterrey|Tijuana|Cancun)/.test(timezone)) return 'MXN';
    if (timezone === 'America/Santiago') return 'CLP';
    if (timezone === 'America/Bogota') return 'COP';
    if (timezone === 'America/Lima') return 'PEN';
    if (timezone === 'America/Montevideo') return 'UYU';
    if (/^America\/(Toronto|Vancouver|Montreal|Winnipeg|Edmonton|Halifax)/.test(timezone)) return 'CAD';
    if (timezone === 'Europe/London') return 'GBP';
    if (timezone.startsWith('Europe/')) return 'EUR';
    if (timezone === 'Asia/Tokyo') return 'JPY';
    if (timezone.startsWith('Australia/')) return 'AUD';
    return 'USD';
  };
  let selectedCurrency = (() => {
    try { const saved = localStorage.getItem(currencyStorageKey); if (currencyOptions.some(([code]) => code === saved)) return saved; } catch { /* Storage is optional. */ }
    return detectCurrency();
  })();
  const currencyToggle = document.createElement('button');
  currencyToggle.type = 'button';
  currencyToggle.className = 'site-currency-toggle';
  currencyToggle.setAttribute('aria-expanded', 'false');
  currencyToggle.setAttribute('aria-controls', 'site-currency-menu');
  currencyToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M15.2 8.3c-.5-.6-1.4-.9-2.6-.9-1.5 0-2.5.7-2.5 1.7 0 2.5 5.8 1 5.8 4 0 1.3-1.2 2.2-3 2.2-1.3 0-2.4-.4-3.1-1.2M12.9 5.8v12.4"/></svg>';
  const currencyMenu = document.createElement('div');
  currencyMenu.className = 'site-currency-menu';
  currencyMenu.id = 'site-currency-menu';
  currencyMenu.hidden = true;
  currencyMenu.setAttribute('role', 'menu');
  const currencyLabels = { es:{heading:'MONEDA',toggle:'Cambiar moneda'}, en:{heading:'CURRENCY',toggle:'Change currency'}, pt:{heading:'MOEDA',toggle:'Mudar moeda'} };
  const currencyLanguage = () => (window.NNytroI18n?.getLanguage?.() || document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : (window.NNytroI18n?.getLanguage?.() || document.documentElement.lang || 'es').toLowerCase().startsWith('pt') ? 'pt' : 'es';
  const renderCurrencyMenu = () => {
    const lang = currencyLanguage();
    currencyToggle.title = `${currencyLabels[lang].toggle} · ${selectedCurrency}`;
    currencyToggle.setAttribute('aria-label', currencyToggle.title);
    currencyMenu.setAttribute('aria-label', currencyLabels[lang].toggle);
    currencyMenu.replaceChildren();
    const heading = document.createElement('strong'); heading.textContent = currencyLabels[lang].heading; currencyMenu.append(heading);
    currencyOptions.forEach(([code,es,en,pt]) => {
      const option = document.createElement('button'); option.type = 'button'; option.setAttribute('role','menuitemradio'); option.setAttribute('aria-checked',String(selectedCurrency === code)); option.dataset.currencyChoice = code; option.textContent = `${code} · ${({es,en,pt})[lang]}`; currencyMenu.append(option);
    });
  };
  const setCurrency = (code) => {
    if (!currencyOptions.some(([currency]) => currency === code)) return;
    selectedCurrency = code;
    try { localStorage.setItem(currencyStorageKey, code); } catch { /* This tab still remembers the current selection. */ }
    renderCurrencyMenu();
    document.dispatchEvent(new CustomEvent('nnytro:currency-change', { detail:{ currency:code } }));
  };
  window.NNytroCurrency = { getCurrency:() => selectedCurrency, setCurrency };
  renderCurrencyMenu();
  currencyToggle.addEventListener('click', () => {
    languageToggle.setAttribute('aria-expanded','false'); languageMenu.hidden = true;
    const open = currencyToggle.getAttribute('aria-expanded') !== 'true';
    currencyToggle.setAttribute('aria-expanded',String(open)); currencyMenu.hidden = !open;
  });
  currencyMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-currency-choice]'); if (!option) return;
    setCurrency(option.dataset.currencyChoice); currencyToggle.setAttribute('aria-expanded','false'); currencyMenu.hidden = true;
  });
  if (document.body.classList.contains('commissions-body')) document.body.append(currencyToggle, currencyMenu);

  // Language control is shared site-wide and delegates translations to the i18n module.
  const languageToggle = document.createElement('button');
  languageToggle.type = 'button';
  languageToggle.className = 'site-language-toggle';
  languageToggle.setAttribute('aria-label', 'Cambiar idioma');
  languageToggle.setAttribute('aria-expanded', 'false');
  languageToggle.setAttribute('aria-controls', 'site-language-menu');
  languageToggle.title = 'Cambiar idioma';
  languageToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18M5.6 6.2h12.8M5.6 17.8h12.8"/></svg>';
  const languageMenu = document.createElement('div');
  languageMenu.className = 'site-language-menu';
  languageMenu.id = 'site-language-menu';
  languageMenu.hidden = true;
  languageMenu.setAttribute('role', 'menu');
  languageMenu.setAttribute('aria-label', 'Idioma del sitio');
  const languageNames = {
    es: { heading: 'IDIOMA', es: 'Español', pt: 'Português (Brasil)', en: 'English', toggle: 'Cambiar idioma', menu: 'Idioma del sitio' },
    pt: { heading: 'IDIOMA', es: 'Espanhol', pt: 'Português (Brasil)', en: 'Inglês', toggle: 'Mudar idioma', menu: 'Idioma do site' },
    en: { heading: 'LANGUAGE', es: 'Spanish', pt: 'Português (Brasil)', en: 'English', toggle: 'Change language', menu: 'Site language' }
  };
  const selectedLanguage = () => {
    const value = window.NNytroI18n?.getLanguage?.() || document.documentElement.lang || 'es';
    return value.toLowerCase().startsWith('pt') ? 'pt' : value.toLowerCase().startsWith('en') ? 'en' : 'es';
  };
  const renderLanguageMenu = () => {
    const current = selectedLanguage();
    languageToggle.setAttribute('aria-label', languageNames[current].toggle);
    languageToggle.title = languageNames[current].toggle;
    languageMenu.setAttribute('aria-label', languageNames[current].menu);
    languageMenu.replaceChildren();
    const heading = document.createElement('strong'); heading.textContent = languageNames[current].heading; languageMenu.append(heading);
    [['es','es'],['pt','pt'],['en','en']].forEach(([locale,key]) => {
      const option = document.createElement('button'); option.type = 'button'; option.setAttribute('role','menuitemradio'); option.setAttribute('aria-checked',String(current === locale)); option.dataset.languageChoice = locale === 'pt' ? 'pt-BR' : locale; option.textContent = languageNames[current][key]; languageMenu.append(option);
    });
  };
  renderLanguageMenu();
  document.addEventListener('nnytro:language-applied', renderLanguageMenu);
  document.addEventListener('nnytro:language-applied', renderCurrencyMenu);
  document.body.append(languageToggle, languageMenu);
  languageMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-language-choice]');
    if (!option) return;
    const language = option.dataset.languageChoice;
    if (window.NNytroI18n?.setLanguage) window.NNytroI18n.setLanguage(language);
    else document.dispatchEvent(new CustomEvent('nnytro:language-change', { detail: { language } }));
    renderLanguageMenu();
    languageToggle.setAttribute('aria-expanded', 'false');
    languageMenu.hidden = true;
  });
  languageToggle.addEventListener('click', () => {
    currencyToggle.setAttribute('aria-expanded','false'); currencyMenu.hidden = true;
    const open = languageToggle.getAttribute('aria-expanded') !== 'true';
    languageToggle.setAttribute('aria-expanded', String(open));
    languageMenu.hidden = !open;
  });
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !languageToggle.contains(event.target) && !languageMenu.contains(event.target)) {
      languageToggle.setAttribute('aria-expanded', 'false');
      languageMenu.hidden = true;
    }
    if (event.target instanceof Node && !currencyToggle.contains(event.target) && !currencyMenu.contains(event.target)) {
      currencyToggle.setAttribute('aria-expanded','false'); currencyMenu.hidden = true;
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    languageToggle.setAttribute('aria-expanded', 'false');
    languageMenu.hidden = true;
    currencyToggle.setAttribute('aria-expanded','false'); currencyMenu.hidden = true;
  });

  let audioContext = null;
  let noiseBuffer = null;
  let lastSoundAt = 0;
  let lastHoverAt = 0;
  let lastZoomAt = 0;

  const getAudioContext = () => {
    try {
      if (!audioContext) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return null;
        audioContext = new Context();
      }
      if (audioContext.state === 'suspended') audioContext.resume()?.catch?.(() => {});
      return audioContext;
    } catch { return null; }
  };

  const tone = (ctx, frequency, endFrequency, start, duration, peak, wave = 'sine') => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.012, duration * 0.22));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  };

  const tick = (ctx, start, peak = 0.009) => {
    try {
      if (!noiseBuffer) {
        noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.045), ctx.sampleRate);
        const samples = noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i += 1) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
      }
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = noiseBuffer;
      filter.type = 'highpass';
      filter.frequency.value = 1800;
      gain.gain.setValueAtTime(peak, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.035);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(start);
      source.stop(start + 0.04);
    } catch { /* The sound layer must never affect the page. */ }
  };

  const sound = (kind = 'click') => {
    if (!enabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const nowMs = performance.now();
    const isHover = kind === 'menu-hover';
    const isZoom = kind === 'zoom';
    if (nowMs - lastSoundAt < (isHover ? 95 : 55)) return;
    if (isHover && nowMs - lastHoverAt < 165) return;
    if (isZoom && nowMs - lastZoomAt < 115) return;
    lastSoundAt = nowMs;
    if (isHover) lastHoverAt = nowMs;
    if (isZoom) lastZoomAt = nowMs;

    try {
      const now = ctx.currentTime;
      switch (kind) {
        case 'menu-hover':
          tone(ctx, 690, 790, now, 0.055, 0.007, 'triangle');
          break;
        case 'modal-open':
          tone(ctx, 390, 690, now, 0.16, 0.018);
          tone(ctx, 780, 900, now + 0.055, 0.11, 0.009);
          tick(ctx, now + 0.01, 0.008);
          break;
        case 'modal-close':
          tone(ctx, 620, 350, now, 0.13, 0.014);
          break;
        case 'filter':
          tone(ctx, 520, 600, now, 0.055, 0.013, 'triangle');
          tick(ctx, now, 0.006);
          break;
        case 'project':
          tone(ctx, 460, 620, now, 0.095, 0.016);
          tone(ctx, 920, 760, now + 0.025, 0.045, 0.004, 'triangle');
          tick(ctx, now, 0.01);
          break;
        case 'zoom':
          tone(ctx, 720, 920, now, 0.06, 0.012, 'triangle');
          break;
        case 'nav':
          tone(ctx, 330, 520, now, 0.12, 0.012, 'triangle');
          tone(ctx, 660, 880, now + 0.045, 0.11, 0.008);
          tick(ctx, now, 0.007);
          break;
        case 'link':
          tone(ctx, 700, 910, now, 0.085, 0.015);
          tick(ctx, now, 0.007);
          break;
        default:
          tone(ctx, 540, 430, now, 0.07, 0.013, 'triangle');
          tick(ctx, now, 0.009);
      }
    } catch { /* Sound device or browser errors should never interfere with navigation. */ }
  };

  toggle.addEventListener('click', () => {
    enabled = !enabled;
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', `${enabled ? 'Desactivar' : 'Activar'} sonidos de la página`);
    toggle.dataset.enabled = String(enabled);
    toggle.title = enabled ? 'Desactivar sonidos' : 'Activar sonidos';
    try { localStorage.setItem('portfolio-sound-enabled', String(enabled)); } catch { /* Storage can be disabled. */ }
    if (enabled) {
      getAudioContext();
      sound('click');
    }
  });

  document.addEventListener('pointerover', (event) => {
    if (!enabled || !(event.target instanceof Element)) return;
    const interactive = event.target.closest('.home-link, .unified-site-nav a, .unified-site-menu, .music-youtube-card, .music-platform-heading a, .contact-channel, .contact-copy a, .gallery-filter, .gallery-card, .back-link');
    if (interactive && !interactive.contains(event.relatedTarget)) sound('menu-hover');
  });

  document.addEventListener('click', (event) => {
    if (!enabled || !(event.target instanceof Element) || event.target.closest('.site-sound-toggle')) return;
    const target = event.target;
    const control = target.closest('a, button, [role="button"], input[type="button"], input[type="submit"]');
    if (!control || control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true') return;
    if (control.matches('[data-close-gallery], [data-close-modal], .gallery-image-viewer-close, .gallery-image-viewer-backdrop, .gallery-modal-close, .commission-image-dialog-close')) sound('modal-close');
    else if (control.matches('[data-zoom-in], [data-zoom-out], [data-zoom-reset]')) sound('zoom');
    else if (control.matches('.gallery-filter')) sound('filter');
    else if (control.matches('.gallery-card')) sound('project');
    else if (control.matches('.gallery-modal-image-button, .commission-hero-image-open, .commission-service-example button')) sound('modal-open');
    else if (control.matches('.tipazo-link, #open-photo')) sound('modal-open');
    else if (control.matches('.unified-site-nav a, .unified-site-menu, .back-link')) sound('nav');
    else if (control.matches('.home-link')) sound('link');
    else sound(control.matches('a') ? 'link' : 'click');
  });

  document.addEventListener('wheel', (event) => {
    if (!enabled || !(event.target instanceof Element)) return;
    if (event.target.closest('.gallery-image-viewer-viewport, .commission-image-dialog-card > img')) sound('zoom');
  }, { passive: true });
  document.addEventListener('pointerdown',event=>{if(enabled&&event.target instanceof Element&&event.target.matches('.commission-image-dialog-card > img'))sound('zoom')},{passive:true});
  document.addEventListener('change',event=>{if(enabled&&event.target instanceof Element&&event.target.matches('input[type="checkbox"],input[type="radio"],input[type="file"],input[type="range"],select,[role="switch"]'))sound('click')});
  document.addEventListener('dblclick',event=>{if(enabled&&event.target instanceof Element&&event.target.matches('.commission-image-dialog-card > img'))sound('zoom')});
  document.addEventListener('keydown',event=>{if(!enabled||!(event.target instanceof Element))return;if(['+','=','-','_'].includes(event.key)&&event.target.closest('.commission-image-dialog-card > img')){sound('zoom');return}if(['ArrowLeft','ArrowRight'].includes(event.key)&&event.target.closest('.commission-image-dialog,.commission-service-visual--multiple'))sound('filter')});

  // Smooth navigation works in production and in the file:// preview used while editing.
  if (!reduceMotion) {
    const makeCurtain = () => {
      const curtain = document.createElement('div');
      curtain.className = 'fx-transition-curtain';
      curtain.setAttribute('aria-hidden', 'true');
      curtain.innerHTML = '<span class="fx-transition-ring"></span><img src="./assets/nutria-loading.png" alt="">';
      document.body.append(curtain);
      return curtain;
    };
    let arrivingFromPage = false;
    try {
      arrivingFromPage = sessionStorage.getItem('nnytro-page-transition') === '1';
      sessionStorage.removeItem('nnytro-page-transition');
    } catch { /* Transitions still work when browser storage is unavailable. */ }
    if (arrivingFromPage) {
      const curtain = makeCurtain();
      curtain.classList.add('is-active');
      requestAnimationFrame(() => requestAnimationFrame(() => curtain.classList.remove('is-active')));
      window.setTimeout(() => curtain.remove(), 720);
    }
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]');
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download') || link.hasAttribute('data-no-transition')) return;
      let destination;
      try { destination = new URL(link.href, location.href); } catch { return; }
      const localFileNavigation = location.protocol === 'file:' && destination.protocol === 'file:' && destination.pathname.startsWith(new URL('./', location.href).pathname);
      if (destination.origin !== location.origin && !localFileNavigation) return;
      if (destination.pathname === location.pathname && destination.search === location.search && destination.hash) return;
      if (!/^https?:$/.test(destination.protocol) && !localFileNavigation) return;
      if (destination.pathname.startsWith('/api/')) return;
      event.preventDefault();
      if (document.querySelector('.fx-transition-curtain.is-active')) return;
      const curtain = makeCurtain();
      try { sessionStorage.setItem('nnytro-page-transition', '1'); } catch { /* The exit transition does not depend on storage. */ }
      requestAnimationFrame(() => curtain.classList.add('is-active'));
      window.setTimeout(() => location.assign(destination.href), 520);
    });
  }

  // A small entrance and scroll reveal make the different sections feel connected.
  if (!reduceMotion) {
    document.querySelector('main')?.classList.add('fx-page-enter');
    const revealTargets = document.querySelectorAll('.unified-site-header, .home-header, .home-intro, .home-menu, .about-portrait-stack, .about-copy, .gallery-toolbar, .gallery-card, .music-feature, .music-listening > *, .contact-layout > *, .contact-footer');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fx-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
      let revealIndex = 0;
      const observeReveal = (element) => {
        if (!(element instanceof Element) || element.classList.contains('fx-reveal')) return;
        element.classList.add('fx-reveal');
        element.style.setProperty('--fx-delay', `${Math.min(revealIndex % 5, 4) * 55}ms`);
        revealIndex += 1;
        observer.observe(element);
      };
      revealTargets.forEach(observeReveal);
      const galleryGrid = document.querySelector('#gallery-grid');
      if (galleryGrid) {
        const additions = new MutationObserver((changes) => changes.forEach((change) => change.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches('.gallery-card')) observeReveal(node);
          node.querySelectorAll?.('.gallery-card').forEach(observeReveal);
        })));
        additions.observe(galleryGrid, { childList: true, subtree: true });
      }
    }
  }
})();

