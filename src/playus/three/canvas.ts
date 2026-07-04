import '../global.css';
import { applyMobileSurfaceStyle, installTouchDefaultGuard } from '../mobile-interaction';
import { type BackgroundConfig, getBackgroundColor, isTransparent } from '../types/background';

export type ThreeCanvasOptions = {
  aspectRatio?: number;
  background?: BackgroundConfig;
};

export function createThreeCanvas(options: ThreeCanvasOptions = {}): HTMLCanvasElement {
  const aspectRatio = options.aspectRatio ?? 1.6;
  const background = getBackgroundColor(options.background);

  const root = document.createElement('div');
  root.id = 'game-root';
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    display: 'grid',
    placeItems: 'center',
    background: background ?? 'transparent',
  } as CSSStyleDeclaration);
  applyMobileSurfaceStyle(root);
  document.body.appendChild(root);

  const viewport = document.createElement('div');
  viewport.id = 'game-viewport';
  Object.assign(viewport.style, {
    width: `min(100vw, calc(100vh / ${aspectRatio}))`,
    aspectRatio: `${1 / aspectRatio}`,
    position: 'relative',
    overflow: 'hidden',
    background: background ?? 'transparent',
  } as CSSStyleDeclaration);
  applyMobileSurfaceStyle(viewport);
  root.appendChild(viewport);

  const canvas = document.createElement('canvas');
  canvas.id = 'gameCanvas';
  Object.assign(canvas.style, {
    width: '100%',
    height: '100%',
    display: 'block',
  } as CSSStyleDeclaration);
  applyMobileSurfaceStyle(canvas);
  installTouchDefaultGuard(canvas);
  viewport.appendChild(canvas);

  return canvas;
}

export function getThreeRendererOptions(background?: BackgroundConfig) {
  return {
    alpha: isTransparent(background),
    antialias: true,
    powerPreference: 'high-performance' as const,
    preserveDrawingBuffer: false,
  };
}
