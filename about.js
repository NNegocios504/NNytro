(() => {
  const carousel = document.querySelector('.about-photo-carousel');
  if (!carousel) return;
  const portrait = carousel.querySelector('.about-portrait');
  const photo = portrait.querySelector('.about-person');
  const frame = portrait.querySelector('.about-window');
  const status = carousel.querySelector('.about-photo-status');
  const photos = [
    { src: './assets/sobremi-personaje.webp', alt: 'Retrato de Ian delante de una ventana gráfica retro' },
    { src: './assets/sobremi-foto-2.png', alt: 'Foto de Ian con efecto rosa y glitch' },
    { src: './assets/sobremi-foto-3.png', alt: 'Foto de Ian con sombrero y una luz verde' }
  ];
  let index = 0;
  photos.slice(1).forEach(item => { const image = new Image(); image.src = item.src; });
  function showPhoto(direction) {
    index = (index + direction + photos.length) % photos.length;
    photo.src = photos[index].src;
    photo.alt = photos[index].alt;
    portrait.setAttribute('aria-label', photos[index].alt);
    frame.hidden = index !== 0;
    portrait.classList.toggle('about-portrait--extra', index !== 0);
    status.textContent = `Foto ${index + 1} de ${photos.length}`;
  }
  carousel.querySelector('.about-photo-arrow--previous').addEventListener('click', () => showPhoto(-1));
  carousel.querySelector('.about-photo-arrow--next').addEventListener('click', () => showPhoto(1));
  carousel.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault(); showPhoto(event.key === 'ArrowLeft' ? -1 : 1);
  });
})();
