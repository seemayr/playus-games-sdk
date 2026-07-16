// Playus Three.js example: reflex game — tap the cube only when it turns green.
// Demonstrates the Three-specific bits: a SOLID background (renderer.setClearColor,
// since an opaque WebGL canvas would otherwise cover the DOM background color),
// raycaster tap-picking, DPR cap, resize handling, and ready() after first render.
// Feature mix: points score, per-try seed, dismiss-only overlay with tap hint,
// delta-clamped timers, shared sounds and haptics, endless shrinking-window ramp.
import * as THREE from 'three';
import {
  clampGameplayDeltaMs,
  createSeededRandom,
  createTapToStartOverlay,
  createTranslator,
  getBackgroundColor,
  getGameSeed,
  nativeBridge,
  seededFloatBetween,
  sound,
} from '@playus.club/games-sdk';
import { createThreeCanvas, getThreeRendererOptions } from '@playus.club/games-sdk/three';
import '@playus.club/games-sdk/styles.css';
import './style.css';

const GAME_ID = 'three-example';
const IDLE_COLOR = 0x2b3440;
const GO_COLOR = 0x8ed7b5;
const MISS_COLOR = 0xff6b6b;

nativeBridge.configure({ gameId: GAME_ID });

const random = createSeededRandom(getGameSeed());

const t = createTranslator({
  hint: {
    en: 'Tap the cube when it turns green',
    de: 'Tippe den Würfel, wenn er grün wird',
    fr: 'Touchez le cube quand il devient vert',
    es: 'Toca el cubo cuando se ponga verde',
    it: 'Tocca il cubo quando diventa verde',
  },
  wait: { en: 'Wait…', de: 'Warte…', fr: 'Attendez…', es: 'Espera…', it: 'Aspetta…' },
  go: { en: 'Now!', de: 'Jetzt!', fr: 'Maintenant !', es: '¡Ahora!', it: 'Ora!' },
});

// Solid background: the DOM viewport gets this color, and we must also hand it to
// the renderer's clear color below — an alpha:false WebGL canvas clears to opaque
// black by default and would otherwise hide it.
const background = { transparent: false, color: '#11141c' } as const;
const canvas = createThreeCanvas({ aspectRatio: 1.6, background });

const scoreElement = document.createElement('div');
scoreElement.className = 'score';
scoreElement.textContent = '0';
canvas.parentElement?.appendChild(scoreElement);

const statusElement = document.createElement('div');
statusElement.className = 'status';
canvas.parentElement?.appendChild(statusElement);

let score = 0;
let hasStarted = false;
let isGameOver = false;
let isGo = false;
let stateTimer = 0;
let goWindow = 1.2;

try {
  const renderer = new THREE.WebGLRenderer({ canvas, ...getThreeRendererOptions(background) });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Solid background → set the renderer clear color (see the note above).
  const bgColor = getBackgroundColor(background);
  if (bgColor) renderer.setClearColor(bgColor, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 2.2));

  const material = new THREE.MeshStandardMaterial({ color: IDLE_COLOR });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.7), material);
  scene.add(cube);

  resize();
  window.addEventListener('resize', resize);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (event) => {
    if (!hasStarted || isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.intersectObject(cube).length === 0) return;

    if (isGo) reward();
    else fail();
  });

  createTapToStartOverlay({
    text: t('hint'),
    mode: 'dismiss-only',
    touchHint: 'tap-timed',
    onStart: startGame,
  });

  sound.preload(['positive-input', 'negative-input', 'level-complete']);

  let hasSentReady = false;
  let lastFrame = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = clampGameplayDeltaMs(now - lastFrame) / 1000;
    lastFrame = now;

    cube.rotation.x += 0.4 * dt;
    cube.rotation.y += 0.6 * dt;

    if (hasStarted && !isGameOver) {
      stateTimer -= dt;
      if (stateTimer <= 0) {
        if (isGo) fail(); // window expired without a tap
        else enterGo();
      }
    }

    renderer.render(scene, camera);

    if (!hasSentReady) {
      hasSentReady = true;
      nativeBridge.game.ready({ version: '1.0.0' });
    }
  });

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function startGame() {
    if (hasStarted || isGameOver) return;
    hasStarted = true;
    nativeBridge.game.started();
    enterIdle();
  }

  function enterIdle() {
    isGo = false;
    material.color.setHex(IDLE_COLOR);
    statusElement.textContent = t('wait');
    // Seeded, per-try idle delay so every player faces the same rhythm.
    stateTimer = seededFloatBetween(random, 0.7, 2.2);
  }

  function enterGo() {
    isGo = true;
    material.color.setHex(GO_COLOR);
    statusElement.textContent = t('go');
    stateTimer = goWindow;
  }

  function reward() {
    score += 1;
    scoreElement.textContent = String(score);
    nativeBridge.game.score(score);
    nativeBridge.device.haptic('tap');
    sound.play('positive-input', { volume: 0.5 });
    goWindow = Math.max(0.32, goWindow * 0.94); // endless ramp: window keeps shrinking
    enterIdle();
  }

  function fail() {
    if (isGameOver) return;
    isGameOver = true;
    material.color.setHex(MISS_COLOR);
    statusElement.textContent = '';
    sound.play(score > 0 ? 'level-complete' : 'negative-input', { volume: 0.6 });
    nativeBridge.device.haptic('failed');
    // Brief final feedback before finishing.
    window.setTimeout(() => nativeBridge.game.finished(score), 900);
  }
} catch (error) {
  nativeBridge.game.error({
    code: 'INIT_FAILED',
    message: error instanceof Error ? error.message : String(error),
  });
}
