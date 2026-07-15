# Game Contract

This is the runtime contract every Playus game bundle must follow. It is the same contract used by Playus-built games.

## Game Design Rules

Playus games are small, one-screen, portrait, touch-first games inside a native app:

- One screen, one input pattern (tap, swipe, drag, hold, or rhythm), understandable from one short hint.
- No start screen or menu. The tap-to-start overlay is the start screen.
- No custom game-over or result screen. Call `finished(score)`; the Playus host shows the result and upload UI. End immediately on completion or failure. The only exception is 0.5–3 seconds of final feedback when the player must see something, for example the correct answer or the missed pattern.
- No settings, pause menu, leaderboard, login, ads, or upload flow inside the game.
- Keep in-game text minimal. The host already shows the game title and description before play; in-game text should be a short hint or essential state.
- Endless score-attack games must keep ramping difficulty (speed, density, precision, pressure) so an impossible ceiling is eventually reached.

## Required Flow

1. Configure the game id.
2. Load required assets for the first playable frame.
3. Call `nativeBridge.game.ready({ version })`.
4. The host calls `window.gameAPI.hostReady(...)`; the SDK replies with `hostReadyAck` automatically.
5. Show the tap-to-start overlay and wait for the player.
6. Call `nativeBridge.game.started()` when the run actually begins.
7. Send `nativeBridge.game.score(score)` when the live leaderboard score meaningfully changes.
8. Call `nativeBridge.game.finished(finalScore)` exactly once.

Recommended state guards — ignore duplicate starts and finishes:

```ts
import { nativeBridge } from '@playus.club/games-sdk';

nativeBridge.configure({ gameId: 'my-game' });

let hasStarted = false;
let isGameOver = false;

async function setup() {
  await loadRequiredAssets();
  nativeBridge.game.ready({ version: '1.0.0' });
}

function startRun() {
  if (hasStarted || isGameOver) return;
  hasStarted = true;
  nativeBridge.game.started();
}

function finishRun(finalScore: number) {
  if (isGameOver) return;
  isGameOver = true;
  stopTimersAndGameplay();
  nativeBridge.game.finished(finalScore);
}
```

The SDK owns the low-level iOS/Android dispatch and the host-ready acknowledgement. Do not hand-roll bridge posting.

## Ready And HostReady

Call `ready()` when the DOM/canvas exists, required assets for the first playable frame are loaded, and the game can be shown.

- Import the SDK in your entry module, not behind a dynamic import. The host checks for `window.gameAPI` shortly after page load and fails the game if it is missing.
- Hosts abort loads that take too long. Aim for `ready()` well under 5 seconds on a mid-range phone.
- Send your bundle version in `ready({ version: '1.2.0' })`. Playus uses it to identify which delivered bundle is running in the field.

Good `ready()` timing examples:

- Phaser: textures loaded in `preload()`, then `ready()` from `create()`.
- Babylon/Three: the scene exists and the first frame has rendered (wait for shader/material compilation on 3D scenes).
- Required JSON/config files have loaded.

Do not call `ready()` while the first playable frame still depends on a pending fetch.

## Started And The Start Overlay

Call `started()` when the run actually begins — usually the first real player input after the start overlay is dismissed.

```ts
import { createTapToStartOverlay } from '@playus.club/games-sdk';

createTapToStartOverlay({
  text: {
    en: 'Tap to start',
    de: 'Tippen zum Starten',
    fr: 'Touchez pour commencer',
    es: 'Toca para empezar',
    it: 'Tocca per iniziare',
  },
  mode: 'dismiss-only',
  touchHint: 'tap',
  onStart: startRun,
});
```

Decisions to make per game:

- `mode: 'dismiss-only'` when the first tap should only close the hint; `mode: 'pass-first-input'` when that tap should also count as gameplay input (e.g. the first tap already hits a target).
- Whether gameplay content may be visible behind the overlay. Fine for layout/search games; memory games should spawn content only after the hint is dismissed.
- Gameplay timers, spawns, and scoring must start only after the hint is dismissed.
- `touchHint` shows a small animated gesture hint (`'tap'`, `'tap-rapid'`, `'tap-sides'`, `'tap-timed'`, `'drag-horizontal'`, `'drag-free'`, `'swipe-4dir'`, `'swipe-horizontal'`, `'swipe-down'`). Use one only when it clearly matches the mechanic; pass `touchHint: false` otherwise.

## Score

Every game produces one numeric score. You only send the numeric value; Playus assigns the score type and display rules in game metadata.

Supported score types: seconds, points, errors, percent, level.

Rules:

- Send values in the real score unit: seconds as seconds (`500ms` is `0.5`, not `500`), points as points, errors as counts, percent as percent, levels as level numbers.
- Playus compares all scores with `>` and displays them as positive values. If a smaller score is better, send it as a negative number. Do not design games around real negative scores.
- Live `score()` updates feed the live leaderboard shown above the game. Send them on meaningful changes only — whole units (whole seconds, points, levels), never every frame or every millisecond.
- For time-based games, send `score(0)` right after `started()` so the player appears on the live leaderboard immediately, then update about once per whole second.
- `finished(finalScore)` carries the exact final value, including fractions, even if live updates were rounded: live `-4`, final `-4.827`.

```ts
nativeBridge.game.started();
nativeBridge.game.score(0);       // live rank shows immediately
// during play, about once per second:
nativeBridge.game.score(-4);      // whole seconds, negative = lower is better
// at the end, exact:
nativeBridge.game.finished(-4.827);
```

## Finished

Call `finished(finalScore)` once when the run is over.

- Stop timers, spawns, and gameplay updates before calling it.
- Guard against duplicate finishes (the host ignores duplicates, but the game should not do extra work).
- Playus shows the final result UI — do not build your own.

## Localization

Game bundles must localize all in-game text, because Playus hosts the bundle as delivered.

The host passes the language in the URL hash:

```txt
#lang=de&groupgame=abc123&playcontext=group-1
```

Use `createTranslator`:

```ts
import { createTranslator, type TranslationDict } from '@playus.club/games-sdk';

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

Required languages: `en`, `de`, `fr`, `es`, `it`. Unknown or missing languages fall back to English. Keep text short enough to fit German and French.

## Seeded Random

All players of the same group game must get a fair, comparable round. Use seeded randomness whenever randomness affects gameplay, difficulty, layout, or scoring opportunity.

```ts
import {
  createSeededRandom,
  getGameSeed,
  seededBetween,
  seededFloatBetween,
  seededShuffle,
} from '@playus.club/games-sdk';

const random = createSeededRandom(getGameSeed());
const x = seededBetween(random, 20, 300);        // int in [20, 300]
const speed = seededFloatBetween(random, 0.8, 1.4);
const order = seededShuffle(random, ['a', 'b', 'c']);
```

- `getGameSeed()` differs per try. Use `getGameSeed({ includePlayContext: false })` only when every try of the same group game should share the exact same layout.
- `Math.random()` is fine for cosmetic effects (particles, tiny visual variation).
- Rare exception: if replaying the same seed would let players peek at the answer and force-close to retry (e.g. a guessing game), unseeded randomness is allowed — but constrain outcomes to a comparable difficulty band and mention it when you deliver the bundle.

## Timing

Gameplay speed must depend on elapsed time, not frame count. Low FPS or WebView throttling must not make the game slower, easier, or change scoring.

For custom game loops, clamp large frame gaps before applying movement, physics, spawning, or animation:

```ts
import { clampGameplayDeltaMs, clampGameplayDeltaSeconds } from '@playus.club/games-sdk';

const deltaMs = clampGameplayDeltaMs(now - lastFrameAt);
const deltaSeconds = clampGameplayDeltaSeconds(deltaMs / 1000);
```

Choose timer behavior from the mechanic:

- Survival / longer-is-better: backgrounded or throttled time must not add score. Pause on `visibilitychange`.
- Reaction / faster-is-better: keep the timer on real elapsed time so locking the phone cannot pause the clock.

There are no native pause/resume callbacks. Use browser signals like `visibilitychange` when the game must stay fair across backgrounding.

## Sounds

Play all audio through the SDK sound manager — it handles the host mute state and the lazy AudioContext.

Shared Playus sounds load from the native app (with a CDN fallback in the browser):

```ts
import { sound } from '@playus.club/games-sdk';

await sound.preload(['positive-input', 'level-complete']);
sound.play('positive-input', { volume: 0.8 });
```

Both `play` and `playUrl` accept an optional pitch shift in semitones — useful for playing melodies or adding variation from a single sample. It works via playback rate, so pitched-up notes also play faster and shorter; stay within roughly ±12 semitones:

```ts
sound.play('piano1', { volume: 0.85, semitones: 7 }); // a fifth up
```

Conventions:

| Moment | Sounds |
| --- | --- |
| Correct input / scoring | `positive-input`, `pop-happy`, `pop-sharp`, `pop-bubble` |
| Level or round complete | `level-complete`, `level-up` |
| Wrong input / failure | `negative-input`, `game-warning`, `pop-multi-down` |
| Collision / impact | `wall-hit`, `wall-hit-2`, `hit-analog` |

When working from a clone of this repository, you can audition the shared sounds in `dev-assets/sounds/games/`. Those previews are not published in the npm package.

Custom sounds: bundle your own files with the game and play them through the same manager — host mute applies automatically:

```ts
const popUrl = new URL('./assets/pop.mp3', import.meta.url).toString();

await sound.preloadUrl(popUrl);
sound.playUrl(popUrl, { volume: 0.6 });
```

Own audio engine (Phaser sound, Babylon audio, ...): subscribe to the host mute state instead. The listener fires immediately with the current state and again on every change:

```ts
sound.onEnabledChange((enabled) => {
  game.sound.mute = !enabled;
});
```

Preload only the sounds needed in the first few seconds. The AudioContext is created lazily — do not create your own.

## Haptics

Haptics are supplemental touch feedback, not required:

```ts
nativeBridge.device.haptic('tap');
```

Conventions: `tap` for successful input, `soft` for small feedback, `failed` for game-ending mistakes, `success` or `confetti` for completion. `release` and `startLoading` exist for special cases.

## Containers And Layout

Games run in a fixed portrait viewport clipped by the host. All UI must fit inside it; do not rely on safe-area insets.

Use the SDK containers instead of building your own root layout:

- Phaser: `createPhaserParent`, `BASE_PHASER_CONFIG`, `getPhaserBackgroundConfig`, `observePhaserParentResize` from `@playus.club/games-sdk/phaser`.
- Babylon: `createCanvas`, `getEngineOptions`, `getClearColor` from `@playus.club/games-sdk/babylon`.
- Three.js / custom WebGL: `createThreeCanvas`, `getThreeRendererOptions` from `@playus.club/games-sdk/three`.
- Plain DOM/canvas: import `@playus.club/games-sdk/styles.css` and build inside a fixed-position root (see the starter example).

Phaser games should observe the actual parent element because an embedded WebView can resize it without emitting a reliable `window.resize` event:

```ts
const parent = createPhaserParent();
const game = new Phaser.Game({
  ...BASE_PHASER_CONFIG,
  scale: { ...BASE_PHASER_CONFIG.scale, parent },
  scene: MainScene,
});

observePhaserParentResize(game, parent);
```

The helper refreshes Phaser's Scale Manager after parent size changes and disconnects automatically when the game is destroyed. It also returns a cleanup function for games that replace the parent before destroying the Phaser instance. Keep gameplay in the fixed virtual coordinates from `BASE_PHASER_CONFIG`; viewport or device-pixel changes must affect presentation, not difficulty or scoring.

For plain Canvas 2D games, observe the actual game container instead of relying only on `window.resize`. The helper sets the canvas backing store before calling `onResize`; `width` and `height` are CSS pixels and `devicePixelRatio` is capped at `2` by default:

```ts
import { observeCanvasSize } from '@playus.club/games-sdk';

const stopObservingCanvas = observeCanvasSize({
  canvas,
  container: gameRoot,
  onResize: ({ width, height, devicePixelRatio }) => {
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    resizeWorld(width, height);
  },
});

// Call stopObservingCanvas() when the game is torn down.
```

Keep the canvas at `width: 100%; height: 100%` in CSS. Pass `maxDevicePixelRatio` when a game needs a lower or higher cap.
Transient zero-sized layout states are ignored until the container has usable bounds.

Backgrounds use one shared config:

```ts
const background = { transparent: false, color: '#1a1b2e' } as const;
```

Transparent backgrounds let the native app background show through; a solid color is cheaper to render. Prefer solid when the game visually owns the whole screen.

Fonts: `styles.css` provides `Unbounded` (big scores, hints, titles), `Space Grotesk` and `Quicksand` (secondary text). They load from the native app, with a CDN fallback in the browser. Custom fonts are fine too — bundle them with your game (woff2, keep them small) and load them with your own `@font-face`.

## Debug Mode

The host appends `d=1` to the URL hash in debug builds. Use it for FPS counters and debug info:

```ts
import { createDebugOverlay, isDebugMode, getRendererInfo } from '@playus.club/games-sdk';

if (isDebugMode()) {
  const overlay = createDebugOverlay(document.body);
  overlay.setRenderer(getRendererInfo().renderer);
  overlay.show();
}
```

Never show debug UI without the flag.

## Optional Host Integrations

- `nativeBridge.game.setColorConfig({...})` updates the native host colors around the game. Use it only when the game changes its visual theme at runtime.
- `nativeBridge.game.message(text, duration?)` shows a native toast on iOS; Android currently ignores it. Do not use it for required instructions.
- `nativeBridge.game.debugMessage(text)` is dev-only feedback.

## Error

Use `error({ code, message })` only when the game cannot initialize or cannot continue because of a real runtime failure. Do not emit errors for recoverable gameplay conditions.

```ts
nativeBridge.game.error({
  code: 'INIT_FAILED',
  message: 'Could not load required assets.',
});
```
