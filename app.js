const photoModal = document.querySelector('#photo-modal');
const openPhoto = document.querySelector('#open-photo');
const closeModalButtons = [...document.querySelectorAll('[data-close-modal]')];
let modalReturnFocus = null;

function setModalOpen(isOpen) {
  if (!photoModal || !openPhoto) return;
  if (isOpen) modalReturnFocus = openPhoto;
  photoModal.hidden = !isOpen;
  document.body.classList.toggle('modal-open', isOpen);
  if (isOpen) photoModal.querySelector('.modal-close')?.focus();
  else (modalReturnFocus instanceof HTMLElement ? modalReturnFocus : openPhoto).focus();
}

openPhoto?.addEventListener('click', () => setModalOpen(true));
closeModalButtons.forEach((button) => button.addEventListener('click', () => setModalOpen(false)));
document.addEventListener('keydown', (event) => {
  if (!photoModal || photoModal.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setModalOpen(false);
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...photoModal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length);
  if (!focusable.length) {
    event.preventDefault();
    photoModal.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !photoModal.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !photoModal.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
});

// La pantalla del televisor sintoniza una vista distinta al apuntar o navegar
// con teclado por cada enlace del menú. Al salir, recupera el canal de inicio.
const homeMenu = document.querySelector('.home-menu');
const tvScreen = document.querySelector('.home-tv-screen');
const tvGroup = tvScreen?.closest('.home-tv-group');

if (homeMenu && tvScreen) {
  const tvPrograms = {
    './inicio.html': {
      title: 'Sobre mí',
      description: 'Dibujo, edito, modelo en 3D y hago música: siempre hay algo nuevo en proceso.',
      image: './assets/menu-preview-sobre-mi.webp',
      alt: 'Retrato de NNytro',
      tint: '#a855f7',
      imageLeft: '7%',
      imageTop: '14.5%',
      imageWidth: '51.5%',
      imageHeight: '60%',
      imageFit: 'cover',
      imageGlow: 'rgba(186, 91, 255, .82)',
      imageGlowSoft: 'rgba(68, 205, 255, .38)',
    },
    './galeria.html': {
      title: 'Portfolio',
      description: 'Un archivo de portadas, dibujos, renders y proyectos hechos a mi manera.',
      image: './assets/menu-preview-portfolio.webp',
      alt: 'Arte de Gravity Core del portfolio',
      tint: '#2563eb',
      imageLeft: '7%',
      imageTop: '14.5%',
      imageWidth: '51.5%',
      imageHeight: '60%',
      imageFit: 'contain',
      imageGlow: 'rgba(211, 128, 255, .82)',
      imageGlowSoft: 'rgba(143, 79, 255, .38)',
    },
    './comisiones.html': {
      title: 'Comisiones',
      description: 'Diseños, renders y proyectos a pedido: mirá las opciones y armemos algo juntos.',
      image: './assets/commission-tomaa.png?v=3',
      alt: 'Ilustración de Toma para la sección de comisiones',
      tint: '#2563eb',
      imageLeft: '7%',
      imageTop: '14.5%',
      imageWidth: '51.5%',
      imageHeight: '60%',
      imageFit: 'contain',
      imageGlow: 'rgba(153, 102, 255, .82)',
      imageGlowSoft: 'rgba(71, 196, 255, .42)',
    },
    './musica.html': {
      title: 'Música',
      description: 'Portadas, ideas y sonidos para escuchar en otra frecuencia.',
      image: './assets/menu-preview-musica.webp',
      alt: 'Portada de quien krajo te entiende',
      tint: '#ec4899',
      imageLeft: '7%',
      imageTop: '14.5%',
      imageWidth: '51.5%',
      imageHeight: '60%',
      imageFit: 'contain',
      imageGlow: 'rgba(92, 174, 255, .88)',
      imageGlowSoft: 'rgba(52, 99, 255, .48)',
    },
    './contacto.html': {
      title: 'Contacto',
      description: '¿Tenés una idea o querés hacer algo juntos? Escribime.',
      image: './assets/menu-preview-contacto.webp',
      alt: 'Televisor de la página de NNytro',
      tint: '#06b6d4',
      imageLeft: '3.5%',
      imageGlow: 'rgba(79, 220, 255, .86)',
      imageGlowSoft: 'rgba(63, 137, 255, .42)',
    },
  };

  const content = document.createElement('div');
  content.className = 'home-tv-content';
  content.setAttribute('aria-hidden', 'true');
  content.innerHTML = '<img class="home-tv-image" alt=""><div class="home-tv-copy"><h2 class="home-tv-title"></h2><p class="home-tv-description"></p></div>';
  tvScreen.append(content);

  const image = content.querySelector('.home-tv-image');
  const title = content.querySelector('.home-tv-title');
  const description = content.querySelector('.home-tv-description');
  let activeLink = null;

  function showProgram(link) {
    const href = new URL(link.href, window.location.href).pathname;
    const program = tvPrograms[link.getAttribute('href')] || tvPrograms[href.slice(href.lastIndexOf('/') + 1)];
    if (!program) return;
    activeLink = link;
    tvGroup?.classList.add('is-tuned');
    content.dataset.channel = program.title.toLowerCase().replaceAll(' ', '-');
    content.style.setProperty('--screen-tint', program.tint);
    content.style.setProperty('--tv-image-glow', program.imageGlow || 'rgba(74, 202, 255, .78)');
    content.style.setProperty('--tv-image-glow-soft', program.imageGlowSoft || 'rgba(74, 202, 255, .34)');
    image.style.left = program.imageLeft || '7%';
    image.style.top = program.imageTop || '14.5%';
    image.style.width = program.imageWidth || '51.5%';
    image.style.height = program.imageHeight || '60%';
    image.style.objectFit = program.imageFit || 'cover';
    image.style.objectPosition = 'center';
    image.style.transition = 'none';
    title.textContent = program.title;
    description.textContent = program.description;
    image.src = program.image;
    image.alt = program.alt;
    content.classList.add('is-tuned');
  }

  function resetProgram(link) {
    if (activeLink !== link) return;
    activeLink = null;
    tvGroup?.classList.remove('is-tuned');
    content.classList.remove('is-tuned');
    content.removeAttribute('data-channel');
    content.style.removeProperty('--screen-tint');
    content.style.removeProperty('--tv-image-glow');
    content.style.removeProperty('--tv-image-glow-soft');
    image.removeAttribute('style');
    image.removeAttribute('src');
    image.alt = '';
    title.textContent = '';
    description.textContent = '';
  }

  homeMenu.querySelectorAll('a.home-link').forEach((link) => {
    link.addEventListener('mouseenter', () => showProgram(link));
    link.addEventListener('mouseleave', () => resetProgram(link));
    link.addEventListener('focus', () => showProgram(link));
    link.addEventListener('blur', () => resetProgram(link));
  });
}





