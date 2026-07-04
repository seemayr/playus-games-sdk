export type Overlay = {
  showHint: () => void;
  hideHint: () => void;
  destroy: () => void;
};

export function createOverlay(canvas: HTMLCanvasElement, text: string): Overlay {
  const viewport = canvas.parentElement as HTMLElement | null;
  if (!viewport) throw new Error('Overlay: canvas has no parent element to mount into');

  if (text === undefined || text === '') {
    console.error('Overlay: text is undefined or empty');
  }

  const root = document.createElement('div');
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '1',
    color: '#fff',
  } as CSSStyleDeclaration);
  viewport.appendChild(root);

  const backdropEl = document.createElement('div');
  Object.assign(backdropEl.style, {
    position: 'absolute',
    inset: '0',
    background: 'rgba(0,0,0,0.55)',
    display: 'none',
  } as CSSStyleDeclaration);
  root.appendChild(backdropEl);

  const hintEl = document.createElement('div');
  hintEl.id = 'gameStartHint';
  Object.assign(hintEl.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '84%',
    textAlign: 'center',
    fontSize: 'min(5.2vh, 6vw)',
    fontFamily: 'Unbounded, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    fontWeight: '700',
    lineHeight: '1.25',
    display: 'none',
  } as CSSStyleDeclaration);
  hintEl.textContent = text;
  root.appendChild(hintEl);

  function showHint() {
    backdropEl.style.display = 'block';
    hintEl.style.display = 'block';
  }

  function hideHint() {
    backdropEl.style.display = 'none';
    hintEl.style.display = 'none';
  }

  function destroy() {
    if (root.parentElement) root.parentElement.removeChild(root);
  }

  return { showHint, hideHint, destroy };
}
