/** Supported touch-hint animation types */
export type TouchHintType =
  | 'tap'
  | 'drag-horizontal'
  | 'tap-sides'
  | 'tap-timed'
  | 'drag-free'
  | 'swipe-4dir'
  | 'swipe-horizontal'
  | 'swipe-down'
  | 'tap-rapid';

export type TouchHint = {
  show: () => void;
  hide: () => void;
  destroy: () => void;
};

let stylesInjected = false;

function injectKeyframes() {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.id = 'touch-hint-keyframes';
  style.textContent = `
    @keyframes th-tap {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
      50% { transform: translate(-50%, -50%) scale(1.35); opacity: 1.0; }
    }
    @keyframes th-tap-rapid {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
      20% { transform: translate(-50%, -50%) scale(1.25); opacity: 1.0; }
      50% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
    }
    @keyframes th-drag-h {
      0%, 100% { left: 5%; }
      50% { left: 95%; }
    }
    @keyframes th-tap-sides-l {
      0%, 48%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
      12%, 38% { opacity: 1.0; transform: translate(-50%, -50%) scale(1.25); }
    }
    @keyframes th-tap-sides-r {
      0%, 52%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
      62%, 88% { opacity: 1.0; transform: translate(-50%, -50%) scale(1.25); }
    }
    @keyframes th-tap-timed {
      0%, 60% { transform: translate(-50%, -50%) scale(1); opacity: 0.25; }
      70% { transform: translate(-50%, -50%) scale(1.4); opacity: 1.0; }
      85%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.25; }
    }
    @keyframes th-drag-free {
      0%   { transform: translate(-50%, -50%) translate(90%, -70%); }
      12%  { transform: translate(-50%, -50%) translate(30%, 90%); }
      25%  { transform: translate(-50%, -50%) translate(-90%, 30%); }
      37%  { transform: translate(-50%, -50%) translate(-30%, -90%); }
      50%  { transform: translate(-50%, -50%) translate(90%, -30%); }
      62%  { transform: translate(-50%, -50%) translate(30%, 90%); }
      75%  { transform: translate(-50%, -50%) translate(-90%, 30%); }
      87%  { transform: translate(-50%, -50%) translate(-30%, -90%); }
      100% { transform: translate(-50%, -50%) translate(90%, -70%); }
    }
    @keyframes th-swipe-4dir {
      0%  { transform: translate(-50%, -50%) translate(140%, 0); opacity: 0; }
      5%  { transform: translate(-50%, -50%) translate(90%, 0); opacity: 0.9; }
      8%  { transform: translate(-50%, -50%) translate(-90%, 0); opacity: 0.9; }
      13% { transform: translate(-50%, -50%) translate(-140%, 0); opacity: 0; }

      25% { transform: translate(-50%, -50%) translate(-140%, 0); opacity: 0; }
      30% { transform: translate(-50%, -50%) translate(-90%, 0); opacity: 0.9; }
      33% { transform: translate(-50%, -50%) translate(90%, 0); opacity: 0.9; }
      38% { transform: translate(-50%, -50%) translate(140%, 0); opacity: 0; }

      50% { transform: translate(-50%, -50%) translate(0, 80%); opacity: 0; }
      55% { transform: translate(-50%, -50%) translate(0, 50%); opacity: 0.9; }
      58% { transform: translate(-50%, -50%) translate(0, -50%); opacity: 0.9; }
      63% { transform: translate(-50%, -50%) translate(0, -80%); opacity: 0; }

      75% { transform: translate(-50%, -50%) translate(0, -80%); opacity: 0; }
      80% { transform: translate(-50%, -50%) translate(0, -50%); opacity: 0.9; }
      83% { transform: translate(-50%, -50%) translate(0, 50%); opacity: 0.9; }
      88% { transform: translate(-50%, -50%) translate(0, 80%); opacity: 0; }
      100% { transform: translate(-50%, -50%) translate(0, 80%); opacity: 0; }
    }
    @keyframes th-swipe-h {
      0%  { transform: translate(-50%, -50%) translate(140%, 0); opacity: 0; }
      5%  { transform: translate(-50%, -50%) translate(90%, 0); opacity: 0.9; }
      8%  { transform: translate(-50%, -50%) translate(-90%, 0); opacity: 0.9; }
      13% { transform: translate(-50%, -50%) translate(-140%, 0); opacity: 0; }

      50% { transform: translate(-50%, -50%) translate(-140%, 0); opacity: 0; }
      55% { transform: translate(-50%, -50%) translate(-90%, 0); opacity: 0.9; }
      58% { transform: translate(-50%, -50%) translate(90%, 0); opacity: 0.9; }
      63% { transform: translate(-50%, -50%) translate(140%, 0); opacity: 0; }
      100% { transform: translate(-50%, -50%) translate(140%, 0); opacity: 0; }
    }
    @keyframes th-swipe-down {
      0%  { transform: translate(-50%, -50%) translate(0, -80%); opacity: 0; }
      8%  { transform: translate(-50%, -50%) translate(0, -50%); opacity: 0.9; }
      14% { transform: translate(-50%, -50%) translate(0, 50%); opacity: 0.9; }
      22% { transform: translate(-50%, -50%) translate(0, 80%); opacity: 0; }
      100% { transform: translate(-50%, -50%) translate(0, 80%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

const CIRCLE_BASE: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 1.0)',
  pointerEvents: 'none',
};

function createCircle(size: string, color: string): HTMLDivElement {
  const el = document.createElement('div');
  Object.assign(el.style, {
    ...CIRCLE_BASE,
    background: color,
    width: size,
    aspectRatio: '1',
  });
  return el;
}

// ── Animation builders ──

function buildTap(container: HTMLDivElement, color: string) {
  const circle = createCircle('30%', color);
  Object.assign(circle.style, {
    top: '50%',
    left: '50%',
    animation: 'th-tap 1.2s ease-in-out infinite',
  });
  container.appendChild(circle);
}

function buildDragHorizontal(container: HTMLDivElement, color: string) {
  const circle = createCircle('28%', color);
  Object.assign(circle.style, {
    top: '50%',
    left: '5%',
    transform: 'translate(-50%, -50%)',
    opacity: '0.7',
    animation: 'th-drag-h 2s ease-in-out infinite',
  });
  container.appendChild(circle);
}

function buildTapSides(container: HTMLDivElement, color: string) {
  const left = createCircle('22%', color);
  Object.assign(left.style, {
    top: '50%',
    left: '15%',
    opacity: '0.15',
    animation: 'th-tap-sides-l 2s ease-in-out infinite',
  });
  container.appendChild(left);

  const right = createCircle('22%', color);
  Object.assign(right.style, {
    top: '50%',
    left: '85%',
    opacity: '0.15',
    animation: 'th-tap-sides-r 2s ease-in-out infinite',
  });
  container.appendChild(right);
}

function buildTapTimed(container: HTMLDivElement, color: string) {
  const circle = createCircle('30%', color);
  Object.assign(circle.style, {
    top: '50%',
    left: '50%',
    animation: 'th-tap-timed 2s ease-in-out infinite',
  });
  container.appendChild(circle);
}

function buildDragFree(container: HTMLDivElement, color: string) {
  const circle = createCircle('26%', color);
  Object.assign(circle.style, {
    top: '50%',
    left: '50%',
    opacity: '0.7',
    animation: 'th-drag-free 3.5s ease-in-out infinite',
  });
  container.appendChild(circle);
}

function buildSwipe4Dir(container: HTMLDivElement, color: string) {
  const circle = createCircle('18%', color);
  Object.assign(circle.style, {
    top: '35%',
    left: '50%',
    animation: 'th-swipe-4dir 4s linear infinite',
  });
  container.appendChild(circle);
}

function buildTapRapid(container: HTMLDivElement, color: string) {
  const circle = createCircle('30%', color);
  Object.assign(circle.style, {
    top: '50%',
    left: '50%',
    animation: 'th-tap-rapid 0.9s ease-in-out infinite',
  });
  container.appendChild(circle);
}

function buildSwipeHorizontal(container: HTMLDivElement, color: string) {
  const circle = createCircle('18%', color);
  Object.assign(circle.style, {
    top: '50%',
    left: '50%',
    animation: 'th-swipe-h 3s linear infinite',
  });
  container.appendChild(circle);
}

function buildSwipeDown(container: HTMLDivElement, color: string) {
  const circle = createCircle('24%', color);
  Object.assign(circle.style, {
    top: '50%',
    left: '50%',
    animation: 'th-swipe-down 2s linear infinite',
  });
  container.appendChild(circle);
}

const BUILDERS: Record<TouchHintType, (container: HTMLDivElement, color: string) => void> = {
  'tap': buildTap,
  'drag-horizontal': buildDragHorizontal,
  'tap-sides': buildTapSides,
  'tap-timed': buildTapTimed,
  'drag-free': buildDragFree,
  'swipe-4dir': buildSwipe4Dir,
  'swipe-horizontal': buildSwipeHorizontal,
  'swipe-down': buildSwipeDown,
  'tap-rapid': buildTapRapid,
};

const CONTAINER_WIDTH: Partial<Record<TouchHintType, string>> = {
  'tap-sides': '75%',
  'swipe-4dir': '85%',
  'swipe-horizontal': '85%',
};

export function createTouchHint(type: TouchHintType, parent: HTMLElement, color = '#ffffff', options?: { top?: string; width?: string }): TouchHint {
  injectKeyframes();

  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'absolute',
    top: options?.top ?? '62%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: options?.width ?? CONTAINER_WIDTH[type] ?? '40%',
    aspectRatio: '1',
    pointerEvents: 'none',
    zIndex: '11',
    display: 'none',
  } as Partial<CSSStyleDeclaration>);

  BUILDERS[type](container, color);
  parent.appendChild(container);

  return {
    show() { container.style.display = 'block'; },
    hide() { container.style.display = 'none'; },
    destroy() { container.remove(); },
  };
}
