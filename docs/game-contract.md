# Game Contract

The public contract is now the same runtime contract used by Playus-hosted game bundles.

## Required Flow

1. Configure the game id.
2. Load required assets for the first playable frame.
3. Call `nativeBridge.game.ready()`.
4. The host calls `window.gameAPI.hostReady(...)`.
5. The SDK replies with `hostReadyAck`.
6. Wait for the player to start.
7. Call `nativeBridge.game.started()`.
8. Send `nativeBridge.game.score(score)` when live leaderboard score meaningfully changes.
9. Call `nativeBridge.game.finished(finalScore)` exactly once.

```ts
import { nativeBridge } from '@playus/games-sdk';

nativeBridge.configure({ gameId: 'my-game' });

async function setup() {
  await loadRequiredAssets();
  nativeBridge.game.ready();
}

function startRun() {
  nativeBridge.game.started();
}

function updateScore(score: number) {
  nativeBridge.game.score(score);
}

function finishRun(finalScore: number) {
  nativeBridge.game.finished(finalScore);
}
```

The SDK owns the low-level iOS/Android dispatch and host-ready acknowledgement. Do not hand-roll bridge posting.

## Ready And HostReady

Call `ready()` when the game can be shown and played without waiting on required assets.

The Playus host then calls `window.gameAPI.hostReady(...)`. The SDK validates the handshake id and emits `hostReadyAck`. The local simulator checks this flow.

Good `ready()` timing examples:

- Phaser textures loaded in `preload()`.
- Babylon/Three scene exists and the first renderable frame is ready.
- Required JSON/config files have loaded.

Do not call `ready()` while the first playable frame still depends on a required fetch.

## Started

Call `started()` when the run actually begins. Usually this is the first real player input after the start overlay.

```ts
import { createTapToStartOverlay } from '@playus/games-sdk';

createTapToStartOverlay({
  text: {
    en: 'Tap to start',
    de: 'Tippen zum Starten',
    fr: 'Touchez pour commencer',
    es: 'Toca para empezar',
    it: 'Tocca per iniziare',
  },
  mode: 'dismiss-only',
  onStart: startRun,
});
```

Use `dismiss-only` when the first tap should only close the hint. Use `pass-first-input` when that tap should also count as gameplay input.

## Score

Every game must finish with one numeric score. You only send the numeric value through the bridge. Playus assigns the final score type and display rules in game metadata.

Supported Playus score types are:

- seconds
- points
- errors
- percent
- levels

Send `score(score)` when the live score meaningfully changes. These updates are used for the live leaderboard, so they should be useful but not noisy.

For time-based games, do not send a new millisecond value every frame. Send updates at sensible points instead, for example full seconds or another visible score step.

Send score values in the real score unit:

- seconds as seconds, not milliseconds: `500ms` is `0.5`, not `500`
- points as points
- errors as error counts
- percentages as percent values
- levels as level numbers

Playus compares all leaderboard values with the same `>` operator and displays scores as positive values. If a smaller score is better, send it as a negative number:

```ts
const elapsedSeconds = 4.82;
nativeBridge.game.score(-4);
nativeBridge.game.finished(-elapsedSeconds);
```

Negative values are only the ranking format for lower-is-better games. Do not design games around real negative scores.

## Finished

Call `finished(finalScore)` once when the run is over. Use the final exact score here, even if live `score()` updates were rounded or throttled.

```ts
const elapsedSeconds = 4.827;

nativeBridge.game.score(-4);
nativeBridge.game.finished(-elapsedSeconds);
```

Playus handles the final result UI.

## Localization

Game bundles must localize in-game text because Playus may host the bundle without source-code adaptation.

The SDK reads `lang` from the URL hash:

```txt
#lang=en&d=1&groupgame=dev-abc123&playcontext=dev
```

Use `createTranslator` for game text:

```ts
import { createTranslator, type TranslationDict } from '@playus/games-sdk';

const translations = {
  hint: {
    en: 'Tap the target',
    de: 'Tippe das Ziel',
    fr: 'Touchez la cible',
    es: 'Toca el objetivo',
    it: 'Tocca il bersaglio',
  },
} satisfies TranslationDict<'hint'>;

const t = createTranslator(translations);
t('hint');
```

Supported languages are `en`, `de`, `fr`, `es`, and `it`. English is the fallback.

## Seeded Random

Use seeded randomness when randomness changes gameplay, difficulty, layout, or scoring opportunity.

```ts
import {
  createSeededRandom,
  getGameSeed,
  seededBetween,
  seededFloatBetween,
  seededShuffle,
} from '@playus/games-sdk';

const random = createSeededRandom(getGameSeed());
const x = seededBetween(random, 20, 300);
const speed = seededFloatBetween(random, 0.8, 1.4);
const order = seededShuffle(random, ['a', 'b', 'c']);
```

`getGameSeed()` combines `groupgame` and `playcontext`. Use `getGameSeed({ includePlayContext: false })` only when every try for the same group game should share the exact same layout.

Cosmetic particles and tiny visual-only variations may use `Math.random()`.

## Timing

For custom game loops, clamp large frame gaps before applying movement or physics.

```ts
import { clampGameplayDeltaMs, clampGameplayDeltaSeconds } from '@playus/games-sdk';

const deltaMs = clampGameplayDeltaMs(now - lastFrameAt);
const deltaSeconds = clampGameplayDeltaSeconds(deltaMs / 1000);
```

## Sounds And Haptics

Sounds and haptics are optional, but useful for touch feedback.

```ts
import { nativeBridge, sound } from '@playus/games-sdk';

await sound.preload(['positive-input', 'level-complete']);
sound.play('positive-input', { volume: 0.5 });

nativeBridge.device.haptic('tap');
nativeBridge.device.haptic('success');
```

The host can call `window.gameAPI.setMuted(true)`. The SDK sound manager handles this automatically.

## Error

Use `error({ code, message })` only when the game cannot initialize or cannot continue because of a real runtime failure.

```ts
nativeBridge.game.error({
  code: 'INIT_FAILED',
  message: 'Could not load required assets.',
});
```
