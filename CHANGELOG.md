# Changelog

## 0.1.8

- Added `refreshOnFontsLoaded()`: loads the shared web fonts explicitly via `document.fonts.load()` and re-invokes a redraw callback once they are usable, so canvas text (Phaser/Babylon/Three) picks up the real font instead of staying on the fallback. Replaces the per-game `document.fonts.ready`/`loadingdone` pattern, which never triggers the download itself and can fire before the font was even requested.

## 0.1.6

- Canvas 2D: added `observeCanvasSize()` to keep the backing store, capped device pixel ratio, and game projection synchronized with the actual container size in embedded WebViews.
- Phaser: added `observePhaserParentResize()` so the Scale Manager refreshes after element-only native host layout changes and cleans up with the game lifecycle.

## 0.1.5

- Tap-to-start (`dismiss-only`): the starting tap no longer leaks into the game on iOS. WebKit re-dispatches the tap's touch and compatibility mouse events to the exposed canvas after the overlay hides itself, which games counted as a first (wrong) input; the overlay now swallows the rest of the starting gesture.
- Tap-to-start: `show()` after a dismissal re-arms the pointer listener; previously a re-shown `dismiss-only` overlay could not be dismissed and blocked all input.

## 0.1.4

- `styles.css` no longer paints the page: removed the `:root` background, `color-scheme: dark` (both made WKWebView opaque and blocked the native Playus background), and the `.playus-game-root` background. Games are transparent by default again; opt into a solid background per game via `BackgroundConfig`.

## 0.1.3

- `sound.play`/`sound.playUrl` accept an optional `semitones` pitch shift (playback-rate based) for melodies and sample variation.

## 0.1.0

- Initial partner release. Bridge protocol v3: `ready` → `hostReady` → `hostReadyAck` → `started` → `score` → `finished`.
- Runtime helpers: native bridge, sounds, haptics, tap-to-start overlay with i18n, touch hints, debug overlay, seeded random, URL params, gameplay delta clamping, Playus fonts and global styles.
- Custom game sounds via `sound.preloadUrl`/`sound.playUrl` (inherit the host mute state) and host-mute subscription via `sound.onEnabledChange` for games with their own audio engine.
- Engine containers for Phaser, Babylon.js, and Three/plain WebGL.
- Local host simulator with handshake validation and example games.
