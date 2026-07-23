# Submission Checklist

If you are converting an existing game, start with [Partner Game Porting Template](partner-game-porting-template.md), then use this checklist before delivery.

Before sending a bundle or opening a source PR, check:

Flow:

- The game uses `@playus.club/games-sdk`, imported in the entry module.
- `nativeBridge.configure({ gameId })` uses the agreed Playus game id.
- `ready({ version })` fires after required assets for the first playable frame are loaded and includes your bundle version.
- The local host simulator receives `hostReadyAck`.
- `started()` fires when the run really begins.
- `score()` is sent only on meaningful live leaderboard changes in whole units, not every frame.
- Time-based games send `score(0)` right after `started()`.
- `finished(finalScore)` fires exactly once with the exact final value.
- The game has a clear end and no custom start, game-over, result, pause, or settings screens.

Scoring:

- The final score is a finite, exact number in the real score unit.
- Time values are sent as seconds, not milliseconds.
- Lower-is-better scores are sent as negative values.

Content and fairness:

- Required assets are bundled locally; no runtime fetches from external services.
- Runtime image formats were chosen by measurement; transparent PNG assets were compared with lossless WebP.
- Intentionally mirrored directional sprites reuse one frame unless a direction-specific detail requires separate art.
- Gameplay-affecting randomness uses seeded random.
- Gameplay speed is based on elapsed time (clamped deltas), not frame count.
- Canvas backing stores and gameplay projection update when their actual container changes size.
- In-game text and start overlays support `en`, `de`, `fr`, `es`, and `it`.
- Host mute state is respected: SDK sounds and `playUrl` handle it automatically; own audio engines subscribe via `sound.onEnabledChange`.
- The framework/runtime is lean enough for mobile WebViews.

Bundle:

- The built `index.html` references assets relatively (`./assets/...`) — with Vite, `base: './'` is set.
- `dist` contains no unused originals, duplicate optimized assets, or unintended source maps.
- The uncompressed `dist` size and final ZIP size were measured and recorded.
- The ZIP contains the contents of `dist` at its root, with `index.html` at the ZIP root.
- The production build works in the local host simulator (served from `public/<game-id>/`).

Bundle delivery should include:

- static build output with `index.html`
- game id and your bundle version (the same value sent via `ready({ version })`)
- the SDK version the game was built with
- game name and short description translations
- score direction and score type notes
- expected average playtime
- uncompressed production-build size and final delivery-ZIP size
- any framework/runtime notes, including seeded-random exceptions
