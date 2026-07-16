<p align="center">
  <img src="docs/assets/playus-web-preview.jpg" alt="Playus dice logo" width="720" />
</p>

# Playus Games SDK

SDK and local host simulator for building Playus-compatible web games.

Partners build games in their own repository and deliver a pre-built static bundle to Playus. The bundle must already use the Playus SDK runtime so it works inside the Playus iOS and Android WebViews without a source-code adaptation step.

## Getting The SDK

```sh
npm install @playus.club/games-sdk
```

The npm package contains the runtime only. For the local host simulator and the example games, clone this repository (see Quick Start below).

The SDK speaks Playus bridge protocol v3. Note the SDK version you built with — it is part of the bundle delivery metadata.

## Quick Start (this repo)

```sh
npm install
npm run dev
```

Open the local host simulator:

```txt
http://localhost:8091
```

The simulator loads the included examples and validates the real Playus bridge flow, including `ready`, `hostReady`, `hostReadyAck`, live score updates, finish events, language params, debug mode, and host mute callbacks.

Porting an existing game? Start with the [Partner game porting template](docs/partner-game-porting-template.md). It summarizes the Playus-specific decisions around app-shell removal, start flow, scoring, assets, audio, fairness, responsiveness, and delivery notes.

## SDK Usage

Import the SDK in your entry module (not behind a dynamic import — the host verifies the bridge exists right after page load):

```ts
import {
  createTapToStartOverlay,
  nativeBridge,
  sound,
} from '@playus.club/games-sdk';
import '@playus.club/games-sdk/styles.css';

nativeBridge.configure({ gameId: 'your-game-id' });

createTapToStartOverlay({
  text: {
    en: 'Tap to start',
    de: 'Tippen zum Starten',
    fr: 'Touchez pour commencer',
    es: 'Toca para empezar',
    it: 'Tocca per iniziare',
  },
  mode: 'dismiss-only',
  onStart: () => {
    nativeBridge.game.started();
    nativeBridge.game.score(0);
  },
});

await sound.preload(['positive-input']);
nativeBridge.game.ready({ version: '1.0.0' });
```

When the run ends:

```ts
nativeBridge.game.finished(finalScore);
```

Engine helpers: `@playus.club/games-sdk/phaser`, `@playus.club/games-sdk/babylon`, and `@playus.club/games-sdk/three` provide ready-made containers and configs. See [the game contract](docs/game-contract.md) for the full runtime rules.

## Sound Previews

The repo includes raw shared game sound previews in `dev-assets/sounds/games/` so developers can audition the Playus sound palette before choosing IDs such as `positive-input`, `pop-sharp`, or `pop-multi-down`.

Those files are repository-only reference assets. They are excluded from the npm package; games should use the SDK sound ids through `sound.preload(...)` and `sound.play(...)`.

## Examples

Four small complete games. All follow the full [game contract](docs/game-contract.md) with localized overlays, sounds, and haptics — and each shows a different feature mix:

| | `games/starter-game` (plain TS) | `games/phaser-example` | `games/babylon-example` | `games/three-example` |
| --- | --- | --- | --- | --- |
| Game | Hit 5 targets fast | Pop bubbles for 20s | Tap the odd cube, endless levels | Tap the cube only when it turns green |
| Score | Time: negative seconds, `score(0)` at start, whole-second live updates, exact fractional final | Points with live updates | Levels with an endless difficulty ramp | Points, endless shrinking-window ramp |
| Seeded random | New layout per try | Same pattern every try (`includePlayContext: false`) | `seededShuffle` + float ranges | Seeded per-try reaction rhythm |
| Start overlay | `dismiss-only`, `tap-sides` hint | `dismiss-only`, `tap-rapid` hint | `dismiss-only`, `tap` hint | `dismiss-only`, `tap-timed` hint |
| Also shows | Real-time score timer (no clamping) | Delta clamping, parent resize handling, countdown clock, warning sound | Transparent background, debug overlay, DPR cap, brief end feedback, `error()` | Solid background + `setClearColor`, raycaster picking, DPR cap, resize, delta clamping |

## Testing Your Own Bundle

The simulator's full handshake only works same-origin. To test your built bundle:

1. Copy your build output into `public/<your-game-id>/` in this repo.
2. Run `npm run dev` and enter `/<your-game-id>/index.html` as the Game URL in the simulator (the explicit `index.html` matters — without it the dev server serves the simulator page instead).

Cross-origin URLs (e.g. your own dev server) still show outgoing events, but `hostReady` cannot be delivered — the simulator marks this and skips handshake checks.

## Delivering A Bundle

Plain source delivery is preferred when you can share it — see [CONTRIBUTING.md](CONTRIBUTING.md). For bundle delivery, Playus expects a static web bundle:

```txt
dist/
  index.html
  assets/...
```

The bundle must:

- run from a static host path with no backend required
- reference all assets **relatively** — with Vite set `base: './'` and check that the built `index.html` uses `./assets/...`, not `/assets/...` (Playus hosts serve bundles from a subpath)
- include the Playus SDK in the compiled output
- send its bundle version via `ready({ version })`
- call `ready()` only after required assets for the first playable frame are loaded
- send meaningful live `score()` updates
- call `finished(finalScore)` exactly once
- support `lang` from the URL hash for in-game text and overlays

Playus handles signing, hosting, game metadata, score type assignment, leaderboard UI, and final result UI.

## Docs

- [Game contract](docs/game-contract.md) — the runtime rules every bundle must follow
- [Partner game porting template](docs/partner-game-porting-template.md) — checklist for converting an existing web game into a Playus-compatible bundle
- [Assets and mobile performance](docs/assets-and-performance.md)
- [Submission checklist](docs/submission-checklist.md)

## License

Source-available under the [Playus Games SDK License](LICENSE.md): free to use for building and delivering games for the Playus apps; not for use in other apps or platforms.
