(() => {
  const player = document.getElementById('youtube-channel-player');
  if (!player) return;

  const externalLink = document.getElementById('youtube-current-video');
  const status = document.getElementById('youtube-video-status');
  const localNotice = document.getElementById('youtube-file-notice');
  const localLink = document.getElementById('youtube-file-link');
  const canEmbed = location.protocol === 'http:' || location.protocol === 'https:';
  const knownVideos = [
    ['CHndrVFQoLU', 'CATAMARCA - Wassabi, coderotrexe (Prod; NNytro)'],
    ['dz9wo5-KDIU', 'DE IDA - NNYTRO, SHIDEN'],
    ['yuc9d6zPeaQ', 'NO JODAN MAS - NNYTRO'],
    ['JRpDavoXWx0', 'PANADERIA - NNYTRO, KEVINN LWNL'],
    ['TMxmLauj9VE', 'MALAYA$ - NNYTRO, MKZZ!'],
    ['e4zDhvc_8_s', 'VULGARES - NNYTRO, SHIIDEN'],
    ['NdZmkBbhg6A', 'EDATEROS - NNytro, Shiiden, MoKoZo (Visualizer)'],
    ['vvGsQzO2wtQ', 'JORDAN - NNYTRO, SHIIDEN'],
    ['XYaK7iOubiE', 'quien krajo te entiende? - NNytro'],
    ['IwEOH7vreUQ', 'GARCHANDO UNOS PARES (Visualizer Oficial)'],
    ['Xfj1OzJc0_4', 'GARCHANDO UNOS PARES (Audio Oficial)'],
    ['zmfTuNkIVsg', 'DEATH PROMESS - NNYTRO, SHIDEN'],
    ['4kJjqyInMB8', 'CODEÍNA - NNytro, Shiden (Visualizer)'],
    ['T4mIkF82SAY', 'DE RUTA - NNYTRO, SHIDEN (VISUALIZER)'],
    ['LmXCH2F690I', 'WASABI vs SIXTO (Woody vs Alfajor)'],
    ['D5eQQNtd2o0', 'RUBY-7TY - NNytro, Shiden (Visualizer)']
  ].map(([id, title]) => ({ id, title, publishedAt: null }));

  let videos = knownVideos;
  let currentIndex = 0;
  const origin = canEmbed ? location.origin : '';

  function openVideo(index) {
    if (!videos.length) return;
    currentIndex = (index + videos.length) % videos.length;
    const video = videos[currentIndex];
    if (canEmbed) {
      const params = new URLSearchParams({ rel: '0', playsinline: '1', origin });
      player.src = `https://www.youtube.com/embed/${encodeURIComponent(video.id)}?${params}`;
    } else {
      player.hidden = true;
      localNotice.hidden = false;
      localLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
    }
    player.title = video.title ? `Reproducir ${video.title}` : 'Video del canal de NNytro';
    externalLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
    externalLink.setAttribute('aria-label', `Abrir “${video.title || 'este video'}” en YouTube`);
    const age = video.publishedAt ? (Date.now() - Date.parse(video.publishedAt)) / 86400000 : Infinity;
    const isNew = age >= 0 && age < 14;
    const ageLabel = age < 1 ? 'hoy' : `hace ${Math.floor(age)} ${Math.floor(age) === 1 ? 'día' : 'días'}`;
    status.classList.toggle('is-new', isNew);
    status.textContent = `${isNew ? '✦ NUEVO · ' + ageLabel + ' · ' : ''}${video.title || 'Video del canal NNytro'} · ${currentIndex + 1}/${videos.length}`;
  }

  function chooseOpeningVideo() {
    const now = Date.now();
    const fresh = videos.filter(video => {
      const age = video.publishedAt ? now - Date.parse(video.publishedAt) : Infinity;
      return age >= 0 && age < 14 * 86400000;
    }).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    if (fresh.length) return videos.indexOf(fresh[0]);
    return Math.floor(Math.random() * videos.length);
  }

  document.getElementById('youtube-previous').addEventListener('click', () => openVideo(currentIndex - 1));
  document.getElementById('youtube-next').addEventListener('click', () => openVideo(currentIndex + 1));

  fetch('./youtube-videos.json', { cache: 'no-store' })
    .then(response => response.ok ? response.json() : Promise.reject(new Error('feed unavailable')))
    .then(data => {
      if (Array.isArray(data.videos) && data.videos.length) {
        const merged = new Map(knownVideos.map(video => [video.id, video]));
        data.videos.forEach(video => {
          if (video?.id) merged.set(video.id, { ...merged.get(video.id), ...video });
        });
        videos = [...merged.values()];
      }
    })
    .catch(() => {})
    .finally(() => openVideo(chooseOpeningVideo()));
})();

