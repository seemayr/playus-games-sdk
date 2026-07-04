# Assets And Mobile Performance

Playus loads games inside a native Android/iOS app through a WebView. Some supported Android devices can be old or slow, so startup time, bundle size, memory use, and frame stability matter.

## Assets

Bundle required assets with your game. Do not depend on external services for required gameplay data, textures, models, or sounds.

Use `new URL(..., import.meta.url)` so Vite includes the asset in the build.

```ts
const playerUrl = new URL('./assets/player.png', import.meta.url);
```

For Phaser, load required images in `preload()`, then call `ready()` from `create()`.

```ts
import { nativeBridge } from '@playus/games-sdk';

preload() {
  this.load.image('player', new URL('./assets/player.png', import.meta.url).toString());
}

create() {
  nativeBridge.game.ready();
}
```

For Babylon.js, load required 3D assets before `ready()`. If you only need simple 3D shapes, prefer generated meshes like `MeshBuilder.CreateBox(...)`.

Keep assets small:

- compressed images
- reasonable texture sizes
- GLB or glTF for 3D models
- a small number of required assets

Avoid:

- large unoptimized 3D exports
- required network fetches
- huge texture atlases for tiny games
- assets copied from Playus internal projects

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

If an engine starts more slowly than the game takes to understand, it is probably too heavy.
