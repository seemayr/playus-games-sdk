<p align="center">
  <img src="docs/assets/playus-web-preview.jpg" alt="Playus dice logo" width="720" />
</p>

# Playus Games SDK

SDK and local host simulator for building Playus-compatible web games.

Partners can build games in their own repository and deliver a pre-built static bundle to Playus. The bundle must already use the Playus SDK runtime so it works inside the Playus iOS and Android WebViews without a source-code adaptation step.

## Quick Start

```sh
npm install
npm run dev
```

Open the local host simulator:

```txt
http://localhost:8091
```

The simulator loads the included examples and validates the real Playus bridge flow, including `ready`, `hostReady`, `hostReadyAck`, live score updates, finish events, language params, debug mode, and host mute callbacks.

## SDK Usage

Install the SDK source that Playus provides for your project. The package name is:

```txt
@playus/games-sdk
```

Minimal game setup:

```ts
import {
  createTapToStartOverlay,
  nativeBridge,
  sound,
} from '@playus/games-sdk';
import '@playus/games-sdk/styles.css';

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
nativeBridge.game.ready();
```

When the run ends:

```ts
nativeBridge.game.finished(finalScore);
```

## Examples

- `games/starter-game`: plain TypeScript starter.
- `games/phaser-example`: Phaser setup using `@playus/games-sdk/phaser`.
- `games/babylon-example`: Babylon.js setup using `@playus/games-sdk/babylon`.

## Delivering A Bundle

Playus expects a static web bundle:

```txt
dist/
  index.html
  assets/...
```

The bundle must:

- run from a static host path with no backend required
- use relative asset URLs or bundled imports
- include the Playus SDK in the compiled output
- call `ready()` only after required assets for the first playable frame are loaded
- send meaningful live `score()` updates
- call `finished(finalScore)` exactly once
- support `lang` from the URL hash for in-game text and overlays

Playus handles signing, hosting, game metadata, score type assignment, leaderboard UI, and final result UI.

## Docs

- [Game contract](docs/game-contract.md)
- [Assets and mobile performance](docs/assets-and-performance.md)
- [Submission checklist](docs/submission-checklist.md)
