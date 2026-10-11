(() => {
  const root = document.documentElement;
  root.classList.add('xp-cursor');

  // Only the menu uses the loader. From there, warm every page shell and its direct assets.
  const isHome = document.querySelector('.home-page') !== null;
  const pageLoader = document.querySelector('.site-loader');
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
        if (response.ok) await response.arrayBuffer();
      } catch { /* A failed resource should not block entry. */ }
    };
    const warmVideoMetadata = (url) => new Promise((resolve) => {
      const video = document.createElement('video');
      retainedVideos.push(video);
      video.preload = 'metadata';
      video.muted = true;
      const finish = () => { video.pause(); resolve(); };
      video.addEventListener('loadedmetadata', finish, { once: true });
      video.addEventListener('error', finish, { once: true });
      setTimeout(finish, 3500);
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
      page.querySelectorAll('link[rel="stylesheet"][href], script[src], img[src]').forEach((asset) => {
        const value = asset.getAttribute(asset.tagName === 'LINK' ? 'href' : 'src');
        if (!value) return;
        const url = new URL(value, route);
        if (url.origin === location.origin) assets.add(url.href);
      });
      page.querySelectorAll('video source[src]').forEach((source) => {
        const url = new URL(source.getAttribute('src'), route);
        if (url.origin === location.origin) videos.add(url.href);
      });
    });

    const assetList = [...assets];
    let assetsLoaded = 0;
    await Promise.all(assetList.map(async (url) => {
      await warmResource(url);
      assetsLoaded += 1;
      setLoadProgress(30 + (assetsLoaded / Math.max(1, assetList.length)) * 55);
    }));

    const videoList = [...videos];
    let videosLoaded = 0;
    await Promise.all(videoList.map(async (url) => {
      await warmVideoMetadata(url);
      videosLoaded += 1;
      setLoadProgress(85 + (videosLoaded / Math.max(1, videoList.length)) * 15);
    }));
    setLoadProgress(100);
  };
  const pageWarmup = isHome ? warmSections() : Promise.resolve();

  if (pageLoader) {
    const startedAt = performance.now();
    document.body.setAttribute('aria-busy', 'true');
    const visibleImages = [...document.querySelectorAll('main img')]
      .filter((image) => {
        const bounds = image.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && bounds.top < innerHeight && bounds.bottom > 0;
      })
      .slice(0, 5);
    const activeVideo = document.querySelector('.home-background-video');
    const ready = (element, eventName) => {
      if (!element) return Promise.resolve();
      if (eventName === 'loadeddata' && element.readyState >= 2) return Promise.resolve();
      if (eventName === 'load' && element.complete && element.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        element.addEventListener(eventName, resolve, { once: true });
        element.addEventListener('error', resolve, { once: true });
      });
    };
    const criticalAssets = Promise.all([
      ready(activeVideo, 'loadeddata'),
      ...visibleImages.map((image) => ready(image, 'load')),
      Promise.race([Promise.resolve(document.fonts?.ready).catch(() => {}), new Promise((resolve) => setTimeout(resolve, 700))])
    ]);
    const minimumTime = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 180 : 900;
    Promise.race([Promise.all([criticalAssets, pageWarmup]), new Promise((resolve) => setTimeout(resolve, 7000))])
      .then(() => new Promise((resolve) => setTimeout(resolve, Math.max(0, minimumTime - (performance.now() - startedAt)))))
      .then(() => {
        document.body.removeAttribute('aria-busy');
        requestAnimationFrame(() => requestAnimationFrame(() => {
          pageLoader.classList.add('site-loader--leaving');
          setTimeout(() => pageLoader.remove(), 2560);
        }));
      });
  }
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  document.querySelectorAll('[data-analog-tv]').forEach((screen) => {
    if (!reduceMotion) screen.classList.add('analog-tv-jitter');
  });

  // Sound remains opt-in, and the visitor's choice follows them between pages.
  let enabled = false;
  try { enabled = localStorage.getItem('portfolio-sound-enabled') === 'true'; } catch { /* Storage can be disabled. */ }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'site-sound-toggle';
  toggle.dataset.enabled = String(enabled);
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.setAttribute('aria-label', `${enabled ? 'Desactivar' : 'Activar'} sonidos de la página`);
  toggle.title = enabled ? 'Desactivar sonidos' : 'Activar sonidos';
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="sound-speaker" d="M3 9v6h4l5 4V5L7 9H3Z"/><path class="sound-wave" d="M15 9a5 5 0 0 1 0 6"/><path class="sound-wave" d="M17.8 6.5a8.5 8.5 0 0 1 0 11"/><path class="sound-muted-mark" d="m16 9 5 6m0-6-5 6"/></svg>';
  document.body.append(toggle);

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
    if (control.matches('[data-close-gallery], [data-close-modal], .gallery-image-viewer-close, .gallery-image-viewer-backdrop, .gallery-modal-close')) sound('modal-close');
    else if (control.matches('[data-zoom-in], [data-zoom-out], [data-zoom-reset]')) sound('zoom');
    else if (control.matches('.gallery-filter')) sound('filter');
    else if (control.matches('.gallery-card')) sound('project');
    else if (control.matches('.gallery-modal-image-button')) sound('modal-open');
    else if (control.matches('.tipazo-link, #open-photo')) sound('modal-open');
    else if (control.matches('.unified-site-nav a, .unified-site-menu, .back-link')) sound('nav');
    else if (control.matches('.home-link')) sound('link');
    else sound(control.matches('a') ? 'link' : 'click');
  });

  document.addEventListener('wheel', (event) => {
    if (!enabled || !(event.target instanceof Element)) return;
    if (event.target.closest('.gallery-image-viewer-viewport')) sound('zoom');
  }, { passive: true });

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

