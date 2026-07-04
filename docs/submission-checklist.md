# Submission Checklist

Before sending a bundle or opening a source PR, check:

- The game uses `@playus/games-sdk`.
- `nativeBridge.configure({ gameId })` uses the agreed Playus game id.
- `ready()` fires after required assets for the first playable frame are loaded.
- The local host simulator receives `hostReadyAck`.
- `started()` fires when the run really begins.
- `score()` is sent only on meaningful live leaderboard changes, not every frame.
- `finished(finalScore)` fires exactly once.
- The final score is a finite, exact number.
- Time values are sent as seconds, not milliseconds.
- Lower-is-better scores are sent as negative values.
- The game has a clear end.
- Required assets are bundled locally.
- Gameplay-affecting randomness uses seeded random.
- In-game text and start overlays support `en`, `de`, `fr`, `es`, and `it`.
- Host mute state is respected through the SDK `sound` manager.
- The framework/runtime is lean enough for mobile WebViews.
- The production build works in the local host simulator.

Bundle delivery should include:

- static build output with `index.html`
- game id
- game name and short description translations
- score direction and score type notes
- expected average playtime
- any framework/runtime notes
