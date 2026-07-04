import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
  createTapToStartOverlay,
  nativeBridge,
  sound,
} from '@playus/games-sdk';
import { createCanvas, getClearColor, getEngineOptions } from '@playus/games-sdk/babylon';
import '@playus/games-sdk/styles.css';
import './style.css';

const GAME_ID = 'babylon-example';
const TARGET_SCORE = 5;

nativeBridge.configure({ gameId: GAME_ID });

let score = 0;
let hasStarted = false;
let hasFinished = false;
let cube: Mesh;

const background = { transparent: false, color: '#11141c' } as const;
const canvas = createCanvas({ background });
const scoreElement = document.createElement('div');
scoreElement.className = 'score';
scoreElement.textContent = '0';
canvas.parentElement?.appendChild(scoreElement);

try {
  const engine = new Engine(canvas, true, getEngineOptions(background));
  const scene = createScene(engine);

  createTapToStartOverlay({
    text: {
      en: 'Tap the cube',
      de: 'Tippe den Würfel',
      fr: 'Touchez le cube',
      es: 'Toca el cubo',
      it: 'Tocca il cubo',
    },
    mode: 'dismiss-only',
    onStart: startGame,
  });

  sound.preload(['positive-input', 'level-complete']);
  canvas.addEventListener('pointerdown', hitCube);

  let hasSentReady = false;
  engine.runRenderLoop(() => {
    cube.rotation.x += engine.getDeltaTime() * 0.00055;
    cube.rotation.y += engine.getDeltaTime() * 0.0009;
    scene.render();

    if (!hasSentReady && scene.isReady()) {
      hasSentReady = true;
      nativeBridge.game.ready();
    }
  });

  window.addEventListener('resize', () => engine.resize());
} catch (error) {
  nativeBridge.game.error({
    code: 'INIT_FAILED',
    message: error instanceof Error ? error.message : String(error),
  });
}

function createScene(engine: Engine): Scene {
  const scene = new Scene(engine);
  scene.clearColor = getClearColor(background);

  new ArcRotateCamera(
    'camera',
    Math.PI / 4,
    Math.PI / 3,
    4.4,
    Vector3.Zero(),
    scene,
  );

  const light = new HemisphericLight('light', new Vector3(0.2, 1, 0.4), scene);
  light.intensity = 1.25;

  cube = MeshBuilder.CreateBox('score-cube', { size: 1.45 }, scene);
  cube.material = createCubeMaterial(scene);

  return scene;
}

function createCubeMaterial(scene: Scene): StandardMaterial {
  const material = new StandardMaterial('cube-material', scene);
  material.diffuseColor = Color3.FromHexString('#8ed7b5');
  material.specularColor = Color3.FromHexString('#ffffff');
  return material;
}

function startGame() {
  if (hasStarted || hasFinished) return;

  hasStarted = true;
  nativeBridge.game.started();
  nativeBridge.game.score(score);
}

function hitCube() {
  if (!hasStarted || hasFinished) return;

  score += 1;
  scoreElement.textContent = String(score);
  nativeBridge.game.score(score);
  nativeBridge.device.haptic('tap');
  sound.play('positive-input', { volume: 0.55 });

  cube.scaling.setAll(1.08);
  window.setTimeout(() => cube.scaling.setAll(1), 90);

  if (score >= TARGET_SCORE) {
    finishGame();
  }
}

function finishGame() {
  if (hasFinished) return;

  hasFinished = true;
  nativeBridge.device.haptic('success');
  sound.play('level-complete', { volume: 0.7 });
  nativeBridge.game.finished(score);
}
