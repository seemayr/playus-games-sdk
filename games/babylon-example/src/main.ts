// Playus Babylon example: 3x3 cube grid, tap the one with the different color.
// Each level the difference shrinks — an endless ramp toward an impossible
// ceiling. One wrong tap ends the run after briefly revealing the odd cube.
// Demonstrates: levels score, dismiss-only overlay with a tap hint,
// seededShuffle + seededFloatBetween,
// transparent background, DPR cap, debug overlay, delta clamping, error().
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Culling/ray';
import {
  clampGameplayDeltaMs,
  createDebugOverlay,
  createSeededRandom,
  createTapToStartOverlay,
  createTranslator,
  getGameSeed,
  getRendererInfo,
  isDebugMode,
  nativeBridge,
  seededFloatBetween,
  seededShuffle,
  sound,
} from '@playus.club/games-sdk';
import { createCanvas, getClearColor, getEngineOptions } from '@playus.club/games-sdk/babylon';
import '@playus.club/games-sdk/styles.css';
import './style.css';

const GAME_ID = 'babylon-example';
const GRID = 3;
const END_FEEDBACK_MS = 1200;

nativeBridge.configure({ gameId: GAME_ID });

const random = createSeededRandom(getGameSeed());

const t = createTranslator({
  hint: {
    en: 'Tap the odd cube',
    de: 'Tippe den anderen Würfel',
    fr: 'Touchez le cube différent',
    es: 'Toca el cubo diferente',
    it: 'Tocca il cubo diverso',
  },
  level: {
    en: 'Level {n}',
    de: 'Level {n}',
    fr: 'Niveau {n}',
    es: 'Nivel {n}',
    it: 'Livello {n}',
  },
});

let level = 0;
let hasStarted = false;
let isGameOver = false;
let oddIndex = 0;
let oddQueue: number[] = [];

// Transparent background: the native Playus gradient shows through the scene.
const background = { transparent: true } as const;
const canvas = createCanvas({ background });

const levelElement = document.createElement('div');
levelElement.className = 'score';
levelElement.textContent = t('level', { n: 1 });
canvas.parentElement?.appendChild(levelElement);

try {
  const engine = new Engine(canvas, true, getEngineOptions(background));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  engine.setHardwareScalingLevel(1 / dpr);

  const scene = new Scene(engine);
  scene.clearColor = getClearColor(background);

  new ArcRotateCamera('camera', -Math.PI / 2, 0.7, 9.5, new Vector3(0, 0, 0.4), scene);
  new HemisphericLight('light', new Vector3(0.25, 1, 0.35), scene).intensity = 1.3;

  const baseMaterial = new StandardMaterial('base', scene);
  const oddMaterial = new StandardMaterial('odd', scene);
  const cubes: Mesh[] = [];

  for (let index = 0; index < GRID * GRID; index += 1) {
    const cube = MeshBuilder.CreateBox(`cube-${index}`, { size: 1.25 }, scene);
    cube.position.x = ((index % GRID) - 1) * 1.8;
    cube.position.z = (Math.floor(index / GRID) - 1) * 1.8;
    cubes.push(cube);
  }

  nextRound();

  scene.onPointerDown = (_event, pick) => {
    if (!hasStarted || isGameOver) return;
    const tapped = pick?.pickedMesh ? cubes.indexOf(pick.pickedMesh as Mesh) : -1;
    if (tapped === -1) return;

    if (tapped === oddIndex) {
      level += 1;
      levelElement.textContent = t('level', { n: level + 1 });
      nativeBridge.game.score(level);
      nativeBridge.device.haptic('tap');
      sound.play(level % 5 === 0 ? 'level-up' : 'pop-sharp', { volume: 0.55 });
      nextRound();
    } else {
      endGame();
    }
  };

  createTapToStartOverlay({
    text: t('hint'),
    mode: 'dismiss-only',
    touchHint: 'tap',
    onStart: () => {
      if (hasStarted || isGameOver) return;
      hasStarted = true;
      nativeBridge.game.started();
    },
  });

  sound.preload(['pop-sharp', 'negative-input', 'level-up']);

  const debug = isDebugMode() ? createDebugOverlay(canvas.parentElement!) : null;
  if (debug) {
    debug.setRenderer(getRendererInfo().renderer);
    debug.show();
  }

  let hasSentReady = false;
  let lastDebugUpdate = 0;
  engine.runRenderLoop(() => {
    if (!isGameOver) {
      const dt = clampGameplayDeltaMs(engine.getDeltaTime()) / 1000;
      for (const cube of cubes) cube.rotation.y += 0.35 * dt;
    }
    scene.render();

    if (debug && performance.now() - lastDebugUpdate > 300) {
      lastDebugUpdate = performance.now();
      debug.setFps(engine.getFps());
    }

    if (!hasSentReady && scene.isReady()) {
      hasSentReady = true;
      nativeBridge.game.ready({ version: '1.0.0' });
    }
  });

  window.addEventListener('resize', () => engine.resize());

  function nextRound() {
    // seededShuffle: every cube becomes the odd one once before any repeats.
    if (oddQueue.length === 0) {
      oddQueue = seededShuffle(random, Array.from({ length: GRID * GRID }, (_, i) => i));
    }
    oddIndex = oddQueue.pop()!;

    const base = new Color3(
      seededFloatBetween(random, 0.15, 0.6),
      seededFloatBetween(random, 0.15, 0.6),
      seededFloatBetween(random, 0.15, 0.6),
    );
    const delta = Math.max(0.035, 0.3 * Math.pow(0.88, level));
    baseMaterial.diffuseColor = base;
    oddMaterial.diffuseColor = new Color3(base.r + delta, base.g + delta, base.b + delta);

    cubes.forEach((cube, index) => {
      cube.material = index === oddIndex ? oddMaterial : baseMaterial;
    });
  }

  function endGame() {
    if (isGameOver) return;

    isGameOver = true;
    sound.play('negative-input', { volume: 0.6 });
    nativeBridge.device.haptic('failed');

    // Brief final feedback: reveal the odd cube, then finish.
    cubes[oddIndex].scaling.setAll(1.3);
    window.setTimeout(() => nativeBridge.game.finished(level), END_FEEDBACK_MS);
  }
} catch (error) {
  nativeBridge.game.error({
    code: 'INIT_FAILED',
    message: error instanceof Error ? error.message : String(error),
  });
}
