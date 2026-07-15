import Phaser from 'phaser';
import { type BackgroundConfig, isTransparent, getBackgroundColor } from '../../background';
import { isDebugMode } from '../../overlay/debug';
import { applyMobileSurfaceStyle } from '../../webview/mobile-interaction';

export const BASE_VIEWPORT_WIDTH = 1200;
export const BASE_VIEWPORT_HEIGHT = 1920;

export type PhaserParentOptions = {
  aspectRatio?: number;
  background?: BackgroundConfig;
};

/**
 * Get Phaser game config for background settings.
 * Merge this with BASE_PHASER_CONFIG when creating Phaser.Game.
 *
 * @example
 * const game = new Phaser.Game({
 *   ...BASE_PHASER_CONFIG,
 *   ...getPhaserBackgroundConfig({ transparent: false, color: '#1a1a2e' }),
 *   scene: [MainScene],
 *   scale: { ...BASE_PHASER_CONFIG.scale!, parent },
 * });
 */
export function getPhaserBackgroundConfig(background?: BackgroundConfig): Partial<Phaser.Types.Core.GameConfig> {
  if (isTransparent(background)) {
    return { transparent: true };
  }

  // Solid background: disable transparency for performance
  const bgColor = getBackgroundColor(background)!;
  return {
    transparent: false,
    backgroundColor: bgColor,
  };
}

export const BASE_PHASER_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  transparent: true,  // Default to transparent (games override via getPhaserBackgroundConfig)
  fps: { target: 60, min: 30, smoothStep: false, deltaHistory: 1 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: undefined,
    width: BASE_VIEWPORT_WIDTH,
    height: BASE_VIEWPORT_HEIGHT,
  },
  banner: false,
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: true,
    clearBeforeRender: true,
    powerPreference: 'high-performance',
    desynchronized: true
  },
};

export function createPhaserParent(options?: PhaserParentOptions): HTMLElement {
  const aspectRatio = options?.aspectRatio ?? 1.6;
  const bgColor = getBackgroundColor(options?.background);

  // Root fills the screen and centers the game viewport
  const root = document.createElement('div');
  root.id = 'game-root';
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    display: 'grid',
    placeItems: 'center',
    background: bgColor ?? 'transparent',
  } as CSSStyleDeclaration);
  applyMobileSurfaceStyle(root);
  document.body.appendChild(root);

  // Viewport enforces aspect ratio (height/width), scales to fit, and serves as Phaser parent
  // aspectRatio: 1.5 = 2:3 portrait, 1.6 = taller portrait, 0.5625 = 16:9 landscape
  const viewport = document.createElement('div');
  viewport.id = 'phaser-parent';
  Object.assign(viewport.style, {
    width: `min(100vw, calc(100vh / ${aspectRatio}))`,
    aspectRatio: `${1 / aspectRatio}`,
    background: bgColor ?? 'transparent',
    position: 'relative',
    overflow: 'hidden',
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

  return viewport;
}

/**
 * Keeps Phaser's Scale Manager in sync when its parent element changes size.
 * Element resizes do not always emit a window resize event in embedded WebViews.
 *
 * The observer disconnects automatically when the game is destroyed. The returned
 * cleanup function is useful when the parent is replaced before the game itself.
 */
export function observePhaserParentResize(game: Phaser.Game, parent: HTMLElement): () => void {
  let animationFrame: number | undefined;
  let isStopped = false;

  const refresh = () => {
    if (isStopped || animationFrame !== undefined) return;

    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = undefined;
      if (!isStopped) game.scale.refresh();
    });
  };

  const observer = typeof ResizeObserver === 'undefined'
    ? undefined
    : new ResizeObserver(refresh);
  observer?.observe(parent);
  window.addEventListener('resize', refresh);

  const cleanup = () => {
    if (isStopped) return;
    isStopped = true;
    observer?.disconnect();
    window.removeEventListener('resize', refresh);
    game.events.off(Phaser.Core.Events.DESTROY, cleanup);

    if (animationFrame !== undefined) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
    }
  };

  game.events.once(Phaser.Core.Events.DESTROY, cleanup);
  refresh();
  return cleanup;
}

export function isOutOfBounds(entity: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.GetBounds) {
  const { width, height } = entity.scene.scale;
  const b = entity.getBounds();
  return b.right < 0 || b.bottom < 0 || b.left > width || b.top > height;
}
