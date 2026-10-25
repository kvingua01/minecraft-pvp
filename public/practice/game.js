const arena = document.querySelector('#arena');
const target = document.querySelector('#target');
const start = document.querySelector('#start');
const scoreLabel = document.querySelector('#score');
const timeLabel = document.querySelector('#time');
const message = document.querySelector('#message');
let score = 0;
let deadline = 0;
let timer;

function moveTarget() {
  target.style.left = Math.random() * Math.max(0, arena.clientWidth - 52) + 'px';
  target.style.top = Math.random() * Math.max(0, arena.clientHeight - 52) + 'px';
}
function finish() {
  clearInterval(timer);
  deadline = 0;
  target.hidden = true;
  message.hidden = false;
  message.textContent = `Time up! You hit ${score} targets.`;
  timeLabel.textContent = 'Time: 0s';
  start.textContent = 'Play again';
}
start.addEventListener('click', () => {
  clearInterval(timer);
  score = 0;
  scoreLabel.textContent = 'Score: 0';
  timeLabel.textContent = 'Time: 30s';
  deadline = Date.now() + 30000;
  message.hidden = true;
  target.hidden = false;
  start.textContent = 'Restart game';
  moveTarget();
  timer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    timeLabel.textContent = `Time: ${remaining}s`;
    if (!remaining) finish();
  }, 100);
});
target.addEventListener('click', () => {
  if (!deadline) return;
  if (Date.now() >= deadline) return finish();
  scoreLabel.textContent = `Score: ${++score}`;
  moveTarget();
});
window.addEventListener('resize', () => { if (deadline) moveTarget(); });
