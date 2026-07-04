import '../global.css';
import { applyMobileSurfaceStyle, installTouchDefaultGuard } from '../mobile-interaction';
import { isDebugMode } from '../overlay/debug';
import { type BackgroundConfig, isTransparent, getBackgroundColor } from '../types/background';
import { Color4 } from '@babylonjs/core/Maths/math.color';

export type CanvasOptions = {
  background?: BackgroundConfig;
};

export function createCanvas(options?: CanvasOptions): HTMLCanvasElement {
  const bgColor = getBackgroundColor(options?.background);

  // Root fills the screen and centers the game viewport
  const root = document.createElement("div");
  root.id = "game-root";
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    display: "grid",
    placeItems: "center",
    ...(bgColor && { background: bgColor }),
  } as CSSStyleDeclaration);
  applyMobileSurfaceStyle(root);
  document.body.appendChild(root);

  // Viewport enforces a 2:3 aspect ratio and scales to fit
  const viewport = document.createElement("div");
  viewport.id = "game-viewport";
  Object.assign(viewport.style, {
    width: "min(100vw, calc(100vh * 0.625))",
    aspectRatio: "0.625",
    position: "relative",
    ...(bgColor && { background: bgColor }),
  } as CSSStyleDeclaration);
  applyMobileSurfaceStyle(viewport);
  root.appendChild(viewport);

  // Debug background (only visible in debug mode, behind canvas)
  if (isDebugMode()) {
    const debugBg = document.createElement('div');
    debugBg.id = 'debug-background';
    Object.assign(debugBg.style, {
      position: 'absolute',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.1)',
      pointerEvents: 'none',
      zIndex: '-1',
    } as CSSStyleDeclaration);
    viewport.appendChild(debugBg);
  }

  // Canvas fills the viewport
  const canvas = document.createElement("canvas");
  canvas.id = "gameCanvas";
  Object.assign(canvas.style, {
    width: "100%",
    height: "100%",
    display: "block"
  } as CSSStyleDeclaration);
  applyMobileSurfaceStyle(canvas);
  installTouchDefaultGuard(canvas);
  viewport.appendChild(canvas);

  return canvas;
}

/**
 * Returns Engine options based on background config with performance optimizations.
 * Use this when creating the Babylon.js Engine.
 *
 * @example
 * const engineOpts = getEngineOptions(background);
 * this.engine = new Engine(this.canvas, true, engineOpts);
 */
export function getEngineOptions(background?: BackgroundConfig) {
  return {
    alpha: isTransparent(background),
    antialias: true,
    // powerPreference: 'high-performance' as const, // no-op on single-GPU iOS devices
    preserveDrawingBuffer: false,
    stencil: false,
    desynchronized: false,
  };
}

/**
 * Returns a Color4 for scene.clearColor based on background config.
 * Use this when setting up the scene.
 *
 * @example
 * this.scene.clearColor = getClearColor(background);
 */
export function getClearColor(background?: BackgroundConfig): Color4 {
  if (isTransparent(background)) {
    return new Color4(0, 0, 0, 0);
  }

  // Parse hex color to Color4
  const hex = getBackgroundColor(background)!;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return new Color4(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
      1
    );
  }

  // Fallback to opaque black
  return new Color4(0, 0, 0, 1);
}
