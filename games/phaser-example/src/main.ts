import Phaser from 'phaser';
import {
  createSeededRandom,
  createTapToStartOverlay,
  getGameSeed,
  nativeBridge,
  seededBetween,
  sound,
} from '@playus/games-sdk';
import {
  BASE_PHASER_CONFIG,
  BASE_VIEWPORT_HEIGHT,
  BASE_VIEWPORT_WIDTH,
  createPhaserParent,
  getPhaserBackgroundConfig,
} from '@playus/games-sdk/phaser';
import '@playus/games-sdk/styles.css';
import './style.css';

const GAME_ID = 'phaser-example';
const TARGET_SCORE = 5;

nativeBridge.configure({ gameId: GAME_ID });

const random = createSeededRandom(getGameSeed());
const background = { transparent: false, color: '#172027' } as const;
const parent = createPhaserParent({ background });

class MainScene extends Phaser.Scene {
  private target!: Phaser.GameObjects.Arc;
  private scoreText!: Phaser.GameObjects.Text;
  private score = 0;
  private hasStarted = false;
  private hasFinished = false;

  constructor() {
    super('main');
  }

  create() {
    const { width, height } = this.scale;

    this.scoreText = this.add.text(width / 2, height * 0.14, '0', {
      fontFamily: 'Unbounded, system-ui, sans-serif',
      fontSize: `${Math.min(92, width * 0.22)}px`,
      fontStyle: '900',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.target = this.add.circle(0, 0, 54, 0x8ed7b5)
      .setStrokeStyle(8, 0xffffff, 0.85)
      .setInteractive();

    this.target.on('pointerdown', () => this.hitTarget());
    this.target.setPosition(width / 2, height / 2);

    createTapToStartOverlay({
      text: {
        en: 'Tap the target',
        de: 'Tippe das Ziel',
        fr: 'Touchez la cible',
        es: 'Toca el objetivo',
        it: 'Tocca il bersaglio',
      },
      mode: 'dismiss-only',
      onStart: () => this.startGame(),
    });

    sound.preload(['positive-input', 'level-complete']);
    nativeBridge.game.ready();
  }

  private startGame() {
    if (this.hasStarted || this.hasFinished) return;

    this.hasStarted = true;
    nativeBridge.game.started();
    nativeBridge.game.score(this.score);
  }

  private hitTarget() {
    if (!this.hasStarted || this.hasFinished) return;

    this.score += 1;
    this.scoreText.setText(String(this.score));
    nativeBridge.game.score(this.score);
    nativeBridge.device.haptic('tap');
    sound.play('positive-input', { volume: 0.55 });

    if (this.score >= TARGET_SCORE) {
      this.finishGame();
      return;
    }

    this.moveTarget();
  }

  private moveTarget() {
    const padding = 84;
    this.target.x = seededBetween(random, padding, this.scale.width - padding);
    this.target.y = seededBetween(random, padding + 110, this.scale.height - padding);
  }

  private finishGame() {
    if (this.hasFinished) return;

    this.hasFinished = true;
    nativeBridge.device.haptic('success');
    sound.play('level-complete', { volume: 0.7 });
    nativeBridge.game.finished(this.score);
  }
}

new Phaser.Game({
  ...BASE_PHASER_CONFIG,
  ...getPhaserBackgroundConfig(background),
  scale: {
    ...BASE_PHASER_CONFIG.scale,
    parent,
    width: BASE_VIEWPORT_WIDTH,
    height: BASE_VIEWPORT_HEIGHT,
  },
  scene: MainScene,
});
