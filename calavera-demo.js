const skull = document.querySelector('#skull-demo-sprite');
const playButton = document.querySelector('#play-skull');
const pauseButton = document.querySelector('#pause-skull');
const restartButton = document.querySelector('#restart-skull');

function play() {
  skull.classList.add('is-playing');
  skull.style.animationPlayState = 'running';
}

function pause() {
  skull.style.animationPlayState = 'paused';
}

function restart() {
  skull.classList.remove('is-playing');
  void skull.offsetWidth;
  skull.classList.add('is-playing');
  skull.style.animationPlayState = 'running';
}

playButton.addEventListener('click', play);
pauseButton.addEventListener('click', pause);
restartButton.addEventListener('click', restart);
