# Contributing Or Delivering A Game

Playus can review either a source-code PR in this repo or a pre-built static game bundle. Partner teams usually deliver only the built bundle.

## Preferred Partner Flow

1. Build your game in your own repository.
2. Install and use `@playus/games-sdk`.
3. Test the game in the local Playus host simulator.
4. Build a static production bundle.
5. Send Playus the bundle plus the required game metadata.

## Source PR Flow

If you are contributing source directly, create a folder under `games/<your-game-id>` and start from one of the examples.

## What We Review

- The game uses the real Playus SDK bridge.
- `ready`, `hostReadyAck`, `started`, `score`, and `finished` happen in the right order.
- Live score updates are meaningful for a leaderboard and are not sent every frame.
- The final score is a single exact number in the real score unit.
- Required assets are local or bundled and load before `ready()`.
- In-game text uses `lang` from the URL hash.
- Gameplay-affecting randomness is seeded when fairness depends on it.
- The framework/runtime choice is lean enough for mobile WebViews.

## What Not To Include

- Login, accounts, analytics, ads, payments, or backend calls required for gameplay.
- A custom leaderboard, upload flow, or final result screen.
- Required remote runtime data fetches.
- Heavy engine exports unless Playus agreed to the tradeoff first.
- Obfuscated or minified source code when submitting source.
- Signing keys, deployment credentials, or Playus backend assumptions.

Playus may still request bundle, performance, metadata, or scoring changes before accepting a game.
