# Assets And Mobile Performance

Playus loads games inside a native Android/iOS app through a WebView. The Playus iOS app requires iOS 18 or newer. Some supported Android devices can be old or slow, so startup time, bundle size, memory use, and frame stability matter.

## Assets

Bundle required assets with your game. Do not depend on external services for required gameplay data, textures, models, or sounds.

Use `new URL(..., import.meta.url)` so Vite includes the asset in the build.

```ts
const playerUrl = new URL('./assets/player.png', import.meta.url);
```

For Phaser, load required images in `preload()`, then call `ready()` from `create()`.

```ts
import { nativeBridge } from '@playus.club/games-sdk';

preload() {
  this.load.image('player', new URL('./assets/player.png', import.meta.url).toString());
}

create() {
  nativeBridge.game.ready();
}
```

For Babylon.js, load required 3D assets before `ready()`. If you only need simple 3D shapes, prefer generated meshes like `MeshBuilder.CreateBox(...)`.

### Choose Image Formats Intentionally

Use the smallest format that preserves the visual quality the game actually needs:

| Asset | Good default | Notes |
| --- | --- | --- |
| Sprites, UI art, and textures with transparency | Lossless WebP | Preserves alpha like PNG and is often substantially smaller. |
| Soft or detailed backgrounds | Lossy WebP around quality 80–90 | Check gradients, edges, and text at the final rendered size. |
| Pixel art or assets that must remain pixel-exact | PNG or lossless WebP | Compare both; keep PNG when it is smaller or required by the toolchain. |
| Simple shapes, markers, and icons | CSS, SVG, or generated canvas geometry | Avoid a bitmap when a small deterministic shape is enough. |
| Photos already encoded efficiently | JPEG or lossy WebP | Convert only when the measured result is smaller at comparable quality. |

WebP supports transparency and works with normal `<img>` elements, CSS backgrounds, Canvas, Phaser, and Vite asset imports. No Playus SDK-specific handling is required. Because Playus targets iOS 18 or newer, iOS does not need a PNG fallback for WebP assets. Continue testing the production build in the Playus host simulator and on supported Android devices; add a fallback only when an explicitly supported Android WebView requires one.

Keep high-quality source files outside the shipped bundle when artists still need editable masters. The production `dist` should contain only the optimized runtime versions.

Do not store two directional frames when one is intentionally just a mirror of the other. For example, a worker that looks identical facing left and right can ship one horizontal frame and use `scaleX(-1)` for the opposite direction. Keep separate frames when lighting, tools, text, handedness, or animation timing is direction-specific.

Compression varies by artwork, so measure instead of assuming. In one production Playus game:

- Three transparent PNG game assets totaled about `676 KB`; lossless WebP reduced them to about `381 KB`.
- A `162 KB` JPEG background became a `55 KB` WebP at quality 85.
- The complete production ZIP dropped from about `867 KB` to `474 KB`.

These numbers are an example, not a required budget. Crisp flat art, noisy textures, alpha edges, and already compressed files can produce very different results.

Keep assets small:

- optimized runtime images
- reasonable texture sizes
- GLB or glTF for 3D models
- a small number of required assets

Avoid:

- large unoptimized 3D exports
- required network fetches
- huge texture atlases for tiny games
- assets copied from Playus internal projects

### Measure The Built Bundle

Measure the production output, not only the source asset directory. Vite includes imported assets in `dist`, while files copied through `public/` may be shipped even when the game never references them.

For a Vite game:

```sh
npm run build
du -sh dist
find dist -type f -exec du -h {} + | sort -h
(cd dist && zip -qr ../game.zip .)
du -h game.zip
```

The ZIP should contain the contents of `dist` at its root, including `index.html`. Record both the uncompressed `dist` size and the final ZIP size in delivery notes. Vite's displayed gzip estimates are useful for JavaScript and CSS transfer size, but they are not a substitute for measuring the actual delivery ZIP.

Before delivery, inspect `dist` for:

- unused or superseded image variants
- source images accidentally copied alongside optimized runtime versions
- source maps that are not intended for delivery
- duplicate fonts, audio, model files, or texture atlases
- unexpectedly large individual files

## Frameworks

Most existing Playus games are built with one of these approaches:

- plain JavaScript or TypeScript with Canvas, DOM, or SVG
- Phaser for 2D games
- Babylon.js for focused 3D games

Other frameworks are allowed when they fit the game and keep the runtime lean.

Good defaults:

- plain JavaScript or TypeScript for very small games, simple canvas games, quizzes, puzzles, and one-screen mechanics
- Phaser for most 2D arcade games
- Babylon.js for 3D games that need a real scene graph, model loading, cameras, lighting, or 3D input
- Three.js for custom lightweight 3D when Babylon.js would be more engine than the game needs

Other possible fits:

- PixiJS for 2D rendering when you want your own loop and systems
- Excalibur.js for TypeScript-first 2D games
- melonJS for lightweight HTML5 games, especially tilemaps or 2.5D games
- PlayCanvas Engine when its 3D workflow is a better fit than Babylon.js or Three.js
- Matter.js or Planck.js when physics is central to the game

If you use a framework that is not already common for Playus games, explain the choice when you submit the bundle.

## Usually Avoid

Avoid heavy engine exports unless Playus has discussed and accepted the tradeoff first.

Usually not a good default:

- Unity Web builds
- Unreal Engine or similar native-engine WebAssembly exports
- Godot web exports for simple games
- no-code or editor-heavy exports that produce large, hard-to-review bundles
- frameworks that require large runtime downloads before the first playable frame

These tools can be technically capable, but they often add startup, memory, and bundle overhead that is hard to justify for small mobile WebView games.

## Performance Rules

Keep the first playable frame fast:

- bundle required assets locally
- load only required first-run assets before `ready()`
- delay optional assets until after the game starts
- avoid remote runtime dependencies
- avoid WebGPU-only rendering paths; older WebViews may only be reliable with WebGL or Canvas
- keep texture sizes, model complexity, particles, shadows, and post-processing modest
- stop work when the game is finished or not visible
- test on a real mobile device when possible, especially Android
- test the production build in the Playus host simulator, not only your framework dev server

Keep frames stable during play:

- clamp delta time before applying movement or physics (see the game contract's Timing section)
- avoid allocating objects in hot update/render loops; pool repeated objects, particles, and projectiles
- cap device pixel ratio for WebGL, usually `Math.min(window.devicePixelRatio || 1, 2)`
- use `requestAnimationFrame` for animation and `performance.now()` for timers; animate transforms/opacity, not layout
- destroy or reuse tweens, timers, meshes, textures, DOM nodes, and event listeners
- throttle debug/FPS text updates to about every 300ms

If an engine starts more slowly than the game takes to understand, it is probably too heavy.
