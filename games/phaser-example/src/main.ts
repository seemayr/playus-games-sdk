// Playus Phaser example: pop as many rising bubbles as you can in 20 seconds.
// Demonstrates: points score with live updates, a seeded spawn pattern shared by
// every try (includePlayContext: false), gameplay delta clamping, countdown with
// clock formatting and a warning sound, responsive parent resizing,
// createTranslator, tap-rapid touch hint.
import Phaser from 'phaser';
import {
  clampGameplayDeltaMs,
  createSeededRandom,
  createTapToStartOverlay,
  createTranslator,
  formatSecondsAsClock,
  getGameSeed,
  nativeBridge,
  seededBetween,
  seededFloatBetween,
  sound,
} from '@playus.club/games-sdk';
import {
  BASE_PHASER_CONFIG,
  BASE_VIEWPORT_HEIGHT,
  BASE_VIEWPORT_WIDTH,
  createPhaserParent,
  getPhaserBackgroundConfig,
  observePhaserParentResize,
} from '@playus.club/games-sdk/phaser';
import '@playus.club/games-sdk/styles.css';
import './style.css';

const GAME_ID = 'phaser-example';
const ROUND_SECONDS = 20;
const BUBBLE_COLORS = [0x8ed7b5, 0xf7d774, 0x9bb8ff, 0xf49ac1];

nativeBridge.configure({ gameId: GAME_ID });

// Same seed for every try of this group game: all players (and retries)
// race the exact same bubble pattern.
const random = createSeededRandom(getGameSeed({ includePlayContext: false }));

const t = createTranslator({
  hint: {
    en: 'Pop as many bubbles as you can',
    de: 'Zerplatze so viele Blasen wie möglich',
    fr: 'Éclatez un maximum de bulles',
    es: 'Explota tantas burbujas como puedas',
    it: 'Scoppia più bolle che puoi',
  },
});

const background = { transparent: false, color: '#172027' } as const;
const parent = createPhaserParent({ background });

class MainScene extends Phaser.Scene {
  private bubbles: Phaser.GameObjects.Arc[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private points = 0;
  private elapsed = 0;
  private spawnIn = 0;
  private warned = false;
  private hasStarted = false;
  private hasFinished = false;

  create() {
    const { width } = this.scale;

    this.scoreText = this.add.text(width / 2, 250, '0', {
      fontFamily: 'Unbounded, system-ui, sans-serif',
      fontSize: '150px',
      fontStyle: '900',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.timeText = this.add.text(width / 2, 110, formatSecondsAsClock(ROUND_SECONDS), {
      fontFamily: 'Unbounded, system-ui, sans-serif',
      fontSize: '60px',
      fontStyle: '700',
      color: '#8ea0ad',
    }).setOrigin(0.5);

    createTapToStartOverlay({
      text: t('hint'),
      mode: 'dismiss-only',
      touchHint: 'tap-rapid',
      onStart: () => this.startGame(),
    });

    sound.preload(['pop-happy', 'game-warning', 'level-complete']);
    nativeBridge.game.ready({ version: '1.0.0' });
  }

  update(_time: number, rawDelta: number) {
    if (!this.hasStarted || this.hasFinished) return;

    // Clamped delta: WebView throttling or frame gaps must not teleport
    // bubbles or eat round time.
    const dt = clampGameplayDeltaMs(rawDelta) / 1000;
    this.elapsed += dt;

    const remaining = Math.max(0, ROUND_SECONDS - this.elapsed);
    this.timeText.setText(formatSecondsAsClock(Math.ceil(remaining)));

    if (!this.warned && remaining <= 3) {
      this.warned = true;
      this.timeText.setColor('#ff6b6b');
      sound.play('game-warning', { volume: 0.6 });
    }

    if (remaining <= 0) {
      this.finishGame();
      return;
    }

    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnBubble();
      this.spawnIn = Math.max(0.42, 0.8 - this.elapsed * 0.018);
    }

    for (let index = this.bubbles.length - 1; index >= 0; index -= 1) {
      const bubble = this.bubbles[index];
      bubble.y -= (bubble.getData('speed') as number) * dt;
      if (bubble.y < -bubble.radius) {
        bubble.destroy();
        this.bubbles.splice(index, 1);
      }
    }
  }

  private startGame() {
    if (this.hasStarted || this.hasFinished) return;

    this.hasStarted = true;
    nativeBridge.game.started();
  }

  private spawnBubble() {
    const radius = seededFloatBetween(random, 45, 80);
    const x = seededBetween(random, Math.ceil(radius) + 20, this.scale.width - Math.ceil(radius) - 20);
    const color = BUBBLE_COLORS[seededBetween(random, 0, BUBBLE_COLORS.length - 1)];
    const speed = seededFloatBetween(random, 180, 320) * (1 + this.elapsed / 30);

    const bubble = this.add.circle(x, this.scale.height + radius, radius, color)
      .setStrokeStyle(6, 0xffffff, 0.6)
      .setData('speed', speed)
      .setInteractive();

    bubble.on('pointerdown', () => this.popBubble(bubble));
    this.bubbles.push(bubble);
  }

  private popBubble(bubble: Phaser.GameObjects.Arc) {
    if (!this.hasStarted || this.hasFinished) return;

    this.points += 1;
    this.scoreText.setText(String(this.points));
    nativeBridge.game.score(this.points);
    nativeBridge.device.haptic('tap');
    sound.play('pop-happy', { volume: 0.55 });

    bubble.destroy();
    this.bubbles = this.bubbles.filter((candidate) => candidate !== bubble);
  }

  private finishGame() {
    if (this.hasFinished) return;

    this.hasFinished = true;
    for (const bubble of this.bubbles) bubble.destroy();
    this.bubbles = [];

    sound.play('level-complete', { volume: 0.7 });
    nativeBridge.device.haptic(this.points >= 15 ? 'confetti' : 'success');
    nativeBridge.game.finished(this.points);
  }
}

const game = new Phaser.Game({
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

observePhaserParentResize(game, parent);
