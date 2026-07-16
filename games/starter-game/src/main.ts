// Playus starter example (plain TypeScript/DOM).
// Demonstrates: lower-is-better time score (live whole seconds negative, exact
// fractional final), score(0) right after started(), per-try seeded layout,
// dismiss-only start overlay with a tap-sides hint, sounds, and haptics.
import {
  createSeededRandom,
  createTapToStartOverlay,
  getGameSeed,
  nativeBridge,
  seededBetween,
  sound,
} from '@playus.club/games-sdk';
import '@playus.club/games-sdk/styles.css';
import './style.css';

const GAME_ID = 'starter-game';
const TARGET_COUNT = 5;

nativeBridge.configure({ gameId: GAME_ID });

// Default seed: every try gets fresh target positions.
const random = createSeededRandom(getGameSeed());

let hits = 0;
let hasStarted = false;
let hasFinished = false;
let startedAt = 0;
let lastWholeSecond = 0;
let rafId = 0;

document.body.innerHTML = `
  <div class="playus-game-root starter-game">
    <div class="score" id="timer">0.0</div>
    <button class="target" id="target" type="button" aria-label="Target"></button>
  </div>
`;

const targetButton = getElement<HTMLButtonElement>('target');
const timerElement = getElement<HTMLDivElement>('timer');

moveTarget();
targetButton.addEventListener('pointerdown', handleTargetTap);

createTapToStartOverlay({
  text: {
    en: 'Hit 5 targets as fast as you can',
    de: 'Triff 5 Ziele so schnell du kannst',
    fr: 'Touchez 5 cibles le plus vite possible',
    es: 'Acierta 5 objetivos lo más rápido posible',
    it: 'Colpisci 5 bersagli il più velocemente possibile',
  },
  mode: 'dismiss-only',
  touchHint: 'tap-sides',
  onStart: startGame,
});

sound.preload(['positive-input', 'level-complete']);
nativeBridge.game.ready({ version: '1.0.0' });

function startGame() {
  if (hasStarted || hasFinished) return;

  hasStarted = true;
  nativeBridge.game.started();
  // Time-based game: report score 0 immediately so the live rank shows up.
  nativeBridge.game.score(0);
  startedAt = performance.now();
  rafId = requestAnimationFrame(tick);
}

function tick() {
  // Faster-is-better: the score timer uses real elapsed time, unclamped.
  const elapsed = (performance.now() - startedAt) / 1000;
  timerElement.textContent = elapsed.toFixed(1);

  const whole = Math.floor(elapsed);
  if (whole > lastWholeSecond) {
    lastWholeSecond = whole;
    // Live updates in whole seconds, negative because lower is better.
    nativeBridge.game.score(-whole);
  }

  rafId = requestAnimationFrame(tick);
}

function handleTargetTap() {
  if (!hasStarted || hasFinished) return;

  hits += 1;
  nativeBridge.device.haptic('tap');
  sound.play('positive-input', { volume: 0.5 });

  if (hits >= TARGET_COUNT) {
    finishGame();
    return;
  }

  moveTarget();
}

function finishGame() {
  if (hasFinished) return;

  hasFinished = true;
  cancelAnimationFrame(rafId);

  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  timerElement.textContent = elapsedSeconds.toFixed(2);
  sound.play('level-complete', { volume: 0.7 });
  nativeBridge.device.haptic('success');
  // Final score is exact, including fractions.
  nativeBridge.game.finished(-elapsedSeconds);
}

function moveTarget() {
  targetButton.style.left = `${seededBetween(random, 16, 84)}%`;
  targetButton.style.top = `${seededBetween(random, 24, 78)}%`;
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}.`);
  return element as T;
}
