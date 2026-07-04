import { getUrlParam } from '../url-params';

/**
 * Shared debug overlay utility for performance monitoring
 * Shows FPS and can be extended for other debug info (memory, draw calls, etc.)
 * Only visible when URL contains ?d=1
 */

export type DebugOverlay = {
  setFps: (fps: number) => void;
  setRenderer: (renderer: string) => void;
  show: () => void;
  hide: () => void;
  destroy: () => void;
};

/**
 * Detect WebGL support and GPU renderer info
 */
export function getRendererInfo(): { supported: boolean; renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      return { supported: false, renderer: 'Canvas 2D (no WebGL)', vendor: 'CPU' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string;
      return { supported: true, renderer, vendor };
    }

    return { supported: true, renderer: 'WebGL (details hidden)', vendor: 'Unknown' };
  } catch {
    return { supported: false, renderer: 'Detection failed', vendor: 'Unknown' };
  }
}

/**
 * Check if debug mode is enabled via URL parameter
 * @returns true if ?d=1 is present in URL
 */
export function isDebugMode(): boolean {
  return getUrlParam('d') === '1';
}

/**
 * Create a debug overlay element with FPS counter
 * Position: top-center, small badge with dark background
 */
export function createDebugOverlay(parentElement: HTMLElement): DebugOverlay {
  const debugEl = document.createElement("div");
  debugEl.id = "debug-overlay";

  Object.assign(debugEl.style, {
    position: "absolute",
    top: "5px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "2px 6px",
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: "12px",
    lineHeight: "1.2",
    borderRadius: "6px",
    pointerEvents: "none",
    userSelect: "none",
    display: "none",
    zIndex: "9999",
  } as CSSStyleDeclaration);

  parentElement.appendChild(debugEl);

  // Create separate lines for FPS and renderer
  const fpsLine = document.createElement('div');
  fpsLine.textContent = '— fps';
  debugEl.appendChild(fpsLine);

  const rendererLine = document.createElement('div');
  rendererLine.style.fontSize = '10px';
  rendererLine.style.opacity = '0.8';
  rendererLine.textContent = '';
  debugEl.appendChild(rendererLine);

  function setFps(fps: number) {
    fpsLine.textContent = `${fps | 0} fps`;
  }

  function setRenderer(renderer: string) {
    rendererLine.textContent = renderer;
  }

  function show() {
    debugEl.style.display = "block";
  }

  function hide() {
    debugEl.style.display = "none";
  }

  function destroy() {
    if (debugEl.parentElement) {
      debugEl.parentElement.removeChild(debugEl);
    }
  }

  return { setFps, setRenderer, show, hide, destroy };
}
