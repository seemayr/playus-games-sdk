# Partner Game Porting Template

Use this document when converting an existing web game into a Playus-compatible game bundle with `@playus.club/games-sdk`.

Authoritative references:

- `README.md` for SDK setup, local simulator usage, and bundle delivery.
- `CONTRIBUTING.md` for source PR and pre-built bundle delivery flow.
- `docs/game-contract.md` for the runtime contract, bridge events, scoring, localization, sounds, haptics, seeded random, timing, and layout rules.
- `docs/assets-and-performance.md` for asset, framework, and mobile WebView performance guidance.
- `docs/submission-checklist.md` for the final handoff checklist and required metadata.
- Example games in `games/`, especially the closest mechanic and engine match.

## Porting Goal

Do not import a partner app shell as-is. The Playus port should keep the core game mechanic, but remove product UI and browser-app behavior that conflicts with native Playus hosting.

The final game should:

- Run as one short portrait WebView game.
- Target the Playus compatibility baseline: iOS 18 or newer plus the supported Android WebViews.
- Use `@playus.club/games-sdk` for bridge, overlays, localization, sounds, haptics, timing, seeded random, and engine helpers.
- Call `ready({ version })`, `started()`, meaningful live `score()` updates, and exactly one `finished(finalScore)`.
- Avoid custom start screens, game-over screens, restart buttons, highscore panels, settings, menus, analytics, and persistent browser storage.
- Bundle or generate required assets locally. Do not require runtime network fetches.
- Keep visible text short and localized for `en`, `de`, `fr`, `es`, and `it`.

## Common Port Findings

Most partner games contain a small core mechanic inside a larger browser app shell. Keep the mechanic and remove the surrounding product behavior.

Typical findings:

- A React/Vite, Next, Vue, or mobile-export shell around a much smaller game loop.
- UI library dependencies used only for menus, dialogs, result panels, settings, or routing.
- A custom start screen or tutorial overlay.
- A custom game-over panel, replay button, highscore display, attempt counter, or leaderboard.
- `localStorage`, IndexedDB, cookies, analytics, backend calls, or account state.
- Runtime asset fetches that need to become bundled imports or generated assets.
- External font or stylesheet fetches, such as Google Fonts, that should be replaced with SDK fonts/styles or bundled local font files when the font is important to the game identity.
- Optional generated model URLs that should not become required runtime fetches unless the model assets are bundled with the game.
- Random level generation that needs to become seeded for group fairness.
- Audio that is either generic ambience or gameplay feedback.

Good Playus port decisions:

- Keep the core mechanic, input pattern, scoring model, and short feedback animations.
- Keep or add a clear difficulty ramp for score-attack and survival games. The player should eventually lose because the game becomes too fast, dense, or precise, not because the run can plateau forever.
- Preserve the original game identity where it matters: stylized fonts, color gradients, model silhouettes, distinctive props, and small cosmetic details should survive the port unless they create a real mobile-performance problem.
- Replace start hints with `createTapToStartOverlay`.
- Pick `mode: 'dismiss-only'` or `mode: 'pass-first-input'` from the original input behavior.
- Remove custom game-over/restart UI. If needed, show only brief result feedback before `nativeBridge.game.finished(score)`.
- Remove local highscores and attempt counters. Playus owns attempts, rankings, and result UI.
- Use seeded random from `createSeededRandom(getGameSeed())` for gameplay-affecting content.
- Send meaningful live score updates and the precise final score.

## Porting Checklist

### 1. Identify The Real Game

Find the smallest source files that contain the actual mechanic. Ignore app scaffolding, marketing UI, framework starter components, routing, dashboards, login, browser navigation, settings, and generic UI libraries.

Record:

- Original framework and engine.
- Runtime dependencies that can be removed.
- Required assets and whether they are bundled, generated, or fetched.
- Any persistence, backend calls, analytics, restart loops, game-over screens, or menus.

### 2. Choose A Lean Mobile-Friendly Engine

Use the smallest engine or framework that fits the mechanic. Playus games commonly use:

- Plain JavaScript or TypeScript with Canvas, DOM, or SVG for simple tap, timing, memory, rhythm, and one-screen games.
- Phaser for 2D sprites, collision, particles, tweens, and arcade-style movement.
- Babylon.js for true 3D scenes, 3D picking, meshes, cameras, and physics.
- Three.js for custom lightweight 3D when a full Babylon setup is not needed.

Other lean, mobile-friendly browser engines can be fine when they fit the game better. Examples:

- PixiJS for renderer-heavy 2D without Phaser's scene/physics stack.
- Excalibur.js for TypeScript-first 2D games.
- melonJS for lightweight HTML5 games, especially tilemaps or 2.5D games.
- PlayCanvas Engine when its 3D workflow is a better fit than Babylon.js or Three.js.
- Matter.js or Planck.js when physics is central to the game.

Avoid heavy app frameworks or game engines unless there is a strong reason and Playus agreed to the tradeoff. Unity WebGL exports, large Godot web exports, full SPA shells, and dependency-heavy UI frameworks are usually a poor fit because games run inside iOS and Android WebViews, including older Android devices. Startup time, bundle size, memory, and steady mobile frame time matter more than desktop richness.

Lean does not mean visually stripped. When the source game has distinctive art direction, keep the parts that make it feel like the same game. Prefer targeted optimizations such as instancing, lower DPR caps, simpler materials, pooled objects, bundled procedural geometry, and removing unused app-shell dependencies before simplifying the visible game experience.

### 3. Normalize The Game Flow

Every Playus port should follow this shape:

1. Configure the native bridge before creating the game.
2. Load required assets and create the first safe visible frame.
3. Show the SDK tap-to-start overlay.
4. Call `nativeBridge.game.ready({ version })`.
5. Start gameplay only when the hint is dismissed or the first intended input happens.
6. Call `nativeBridge.game.started()` exactly once.
7. Send `nativeBridge.game.score(score)` on meaningful live leaderboard changes.
8. Call `nativeBridge.game.finished(finalScore)` once.

Remove or replace:

- Custom start overlays.
- Custom result screens.
- Restart buttons.
- Highscore displays.
- Attempt counters.
- Browser storage for gameplay state.
- Pause/settings/leaderboard/upload flows.

### 4. Decide First Input Behavior

Check the original game before choosing overlay mode.

Use `dismiss-only` when the first tap should only hide the hint and should not affect gameplay.

Use `pass-first-input` when the first touch is already a gameplay action, such as:

- Hold to charge.
- Drag to aim.
- Swipe to move.
- Tap to jump.
- Tap left/right to choose a side.

Document this decision in the delivery notes.

### 5. Score For Playus

Keep score simple and comparable.

- The bridge score is a JavaScript number/double, not an integer-only field.
- Choose the most logical Playus-native score unit, as close as practical to the score shown in the game UI.
- Do not multiply decimal values into integers just to preserve precision. If the game shows `47.3 m`, send `47.3`, not `473`.
- Higher raw bridge score always wins.
- Lower-is-better results should be sent as negative values.
- Time scores always use seconds as the base unit. Send `0.5` for 500 milliseconds, not `500`.
- Live score updates should be meaningful, not per-frame.
- For event-driven games, prefer semantic score updates such as landing, round completion, correct answer, death, or finish. Do not emit multiple bridge score updates during one jump, swipe, drag, or animation just because a decimal changed.
- For continuously increasing distance or survival scores, the HUD can update more often than the bridge. Send bridge score updates on clear milestones, such as every 10 meters or every full second, plus the final actual score.
- Final score should be the precise actual result for that run.

Playus currently supports these score display types:

- seconds
- points
- errors
- percent
- level

The game only sends numeric values through the bridge. The Playus system assigns and formats the score type later. If the player-facing unit differs from the bridge value, document the mapping and the reason.

### 6. Assets, Audio, And Haptics

Prefer:

- Imported local assets.
- Lossless WebP for transparent sprites and UI art when it is smaller than PNG.
- Lossy WebP around quality 80–90 for detailed backgrounds when visual comparison confirms the result.
- One directional sprite plus a runtime mirror when left and right are intentionally identical.
- Small generated textures.
- Procedural fallback geometry when it avoids shipping or fetching heavy models.
- Locally bundled game-specific fonts when they materially support the game's visual identity or readability.
- SDK `sound` IDs.
- SDK/native haptics for important feedback.
- Small custom audio engines only when the sound is tightly tied to the mechanic.

Avoid:

- Runtime asset fetches.
- Remote font CSS or externally hosted models required for the first playable frame.
- Shipping PNG masters alongside equivalent optimized WebP runtime assets.
- Duplicate mirrored frames without a direction-specific visual reason.
- Large texture sets.
- Background soundtracks or long ambient loops.
- Custom audio engines for generic click, success, or fail sounds that SDK sounds already cover.

Use `@playus.club/games-sdk/styles.css` when using SDK overlays or Playus fonts.

WebP supports transparency and requires no SDK-specific integration. The iOS 18 minimum means WebP does not require an iOS PNG fallback. Import it like any other local asset and verify the production build in the host simulator and on supported Android devices. Prefer lossless WebP for crisp transparent artwork; use lossy compression only after checking the asset at its actual in-game size.

When working from a clone of the SDK repository, listen to the shared sound previews in `dev-assets/sounds/games/`. Those files are reference assets only and are not shipped in the npm package.

Game-specific fonts are allowed when removing them would weaken the game aesthetic, for example a retro arcade score font. Integrate them as normal game assets:

- Put font files in the game bundle.
- Load them from local CSS with `@font-face`.
- Use `font-display: swap` and sensible fallback fonts.
- Do not import Google Fonts CSS or fetch fonts from remote URLs at runtime.

If a game has gameplay-critical generated audio, keep it only when it improves the feel of the mechanic. For example, a hold-to-charge interaction may use a tiny WebAudio synth whose pitch follows charge strength. In that case, subscribe to the SDK sound state so the game still follows the native app mute switch:

```ts
import { sound } from '@playus.club/games-sdk';

const unsubscribe = sound.onEnabledChange((enabled) => {
  customAudio.setEnabled(enabled);
});
```

When muted, the custom engine should stop active loops immediately and avoid starting new sounds.

### 7. Fairness And Performance

Use seeded random for gameplay-affecting layouts, obstacles, targets, or scoring opportunities. Use `clampGameplayDeltaMs` or `clampGameplayDeltaSeconds` for simulation movement and timers that should not jump after WebView throttling.

Difficulty should keep sharpening for score-attack and survival games. Prefer uncapped pressure such as speed, density, precision, shorter reaction windows, tighter timing, longer sequences, or more simultaneous demands. Only cap values when an uncapped value would break math, make timings unreadable, or cause a real performance issue.

Generated content must remain theoretically solvable. A perfect zero-reaction player or solver should always have at least one valid path through deterministic random content such as lanes, walls, spikes, platforms, target fields, or obstacle rows. Later content may be practically impossible for humans, but should not contain fully blocked walls, unreachable landing gaps, unavoidable lane patterns, or other no-win states.

Check responsive bounds as part of the port. Games should be responsive by default because the host game area may change over time. Optimize the gameplay presentation for portrait screens around a `1.6` height/width ratio, but do not hard-limit the game to that exact ratio unless Playus explicitly approved a fixed-format port.

Viewport size, CSS pixel size, physical pixel size, and device pixel ratio must not change difficulty. Keep gameplay dimensions in stable world units, a stable virtual coordinate system, or one uniform gameplay scale. Adapt camera, framing, background, and UI to the viewport instead of making obstacles, lanes, hit areas, safe areas, spawn spacing, movement speeds, timing windows, or scoring easier on wider, taller, denser, or larger bounds. If the game area has more pixels or more visual room, player size, hazard size, path width, and safe gaps should scale together so their proportions and difficulty stay the same.

Fullscreen device edges need care. Many phones and tablets reserve edge areas for system gestures such as back, home, app switching, or native edge swipes. When the port has explicit visible controls, buttons, pads, sliders, or fixed tap targets, avoid placing them directly against the game bounds when a small safe margin is possible. This is only a control-placement guideline: do not add large dead zones, do not block global tap-anywhere or swipe gameplay mechanics, and do not force awkward layouts just to avoid every edge-adjacent interaction.

Balance performance against game experience. Removing large textures, remote models, heavyweight engines, shadows, post-processing, or unbounded particles is often a good trade. Removing a cheap gradient, small instanced props, readable vehicle shapes, or a defining font is usually a bad trade unless profiling or device testing shows it matters.

Keep memory bounded on long attempts. Endless generators such as lane traffic, walls, projectiles, particles, collectible streams, background props, or cosmetic items should not grow the game forever. When an entity leaves the active play area, remove it from arrays/scene graphs/physics worlds or return it to a bounded pool. Also clean up tweens, timers, event listeners, audio nodes, debug log entries, materials, textures, and DOM nodes that are no longer needed.

Review:

- Is generated content solvable for a perfect zero-reaction player or solver?
- Does difficulty keep ramping until failure is practically inevitable for real players?
- Does the game avoid a stable endless plateau?
- Does endless generation stay memory-bounded over long attempts?
- Does backgrounding or low FPS create an advantage?
- Are object allocations low in hot update loops?
- Does startup avoid heavy noncritical work?
- Are explicit controls padded away from fullscreen device edges when practical, without blocking normal gameplay input?

### 8. Delivery Follow-Up

After implementation:

- Build a static production bundle with relative asset paths. With Vite, set `base: './'`.
- Inspect `dist` for unused originals, duplicate variants, accidental source maps, and unexpectedly large files.
- Measure and record both the uncompressed `dist` size and the ZIP made from the contents of `dist`.
- Test the production bundle in the local Playus host simulator, served from `public/<game-id>/`.
- Verify the host simulator receives `hostReadyAck`.
- Verify `ready`, `started`, live `score`, and `finished` arrive in the expected order.
- Verify all required text works for `en`, `de`, `fr`, `es`, and `it`.
- Check the final score value against the in-game UI and intended Playus score type.
- Review `docs/submission-checklist.md`.

Bundle delivery should include:

- Static build output with `index.html`.
- Game id and bundle version, matching the value sent via `ready({ version })`.
- SDK version used for the build.
- Game name and short description translations.
- Score direction and score type notes.
- Expected average playtime.
- Framework/runtime notes, including seeded-random exceptions.
- Uncompressed production-build size and final delivery-ZIP size.
- Any important porting decisions, such as first-input mode, custom audio, bundled fonts, or intentionally fixed-format layout.
