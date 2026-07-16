import { getCurrentLanguage, type Language } from '../i18n';
import { createTouchHint, type TouchHint, type TouchHintType } from './touch-hint';

export type TapToStartMode = 'dismiss-only' | 'pass-first-input';
export type LocalizedText = string | Partial<Record<Language, string>>;

export type TapToStartOverlay = {
  show: () => void;
  hide: () => void;
  destroy: () => void;
};

type TapToStartOptions = {
  parent?: HTMLElement;
  text?: LocalizedText;
  touchHint?: TouchHintType | false;
  mode?: TapToStartMode;
  onStart: (event: PointerEvent) => void;
};

export function createTapToStartOverlay(options: TapToStartOptions): TapToStartOverlay {
  const parent = options.parent ?? document.body;
  const mode = options.mode ?? 'dismiss-only';
  const root = document.createElement('div');
  const label = document.createElement('div');
  let touchHint: TouchHint | null = null;

  root.className = 'playus-tap-start';
  root.style.pointerEvents = mode === 'dismiss-only' ? 'auto' : 'none';

  label.className = 'playus-tap-start__label';
  label.textContent = localizedText(options.text ?? {
    en: 'Tap to start',
    de: 'Tippen zum Starten',
    fr: 'Touchez pour commencer',
    es: 'Toca para empezar',
    it: 'Tocca per iniziare',
  });
  label.style.pointerEvents = mode === 'dismiss-only' ? 'auto' : 'none';

  root.appendChild(label);
  parent.appendChild(root);

  if (options.touchHint !== false) {
    touchHint = createTouchHint(options.touchHint ?? 'tap', root, '#ffffff', {
      top: '64%',
    });
    touchHint.show();
  }

  function handlePointerDown(event: PointerEvent) {
    if (mode === 'dismiss-only') {
      event.preventDefault();
      event.stopPropagation();
      swallowGestureTail();
    }

    hide();
    options.onStart(event);
  }

  // idempotent: re-adding the same listener is a no-op, so show() after
  // hide() re-arms dismissal instead of leaving an undismissable overlay
  function attach() {
    if (mode === 'dismiss-only') {
      root.addEventListener('pointerdown', handlePointerDown);
    } else {
      parent.addEventListener('pointerdown', handlePointerDown, true);
    }
  }

  function show() {
    root.hidden = false;
    touchHint?.show();
    attach();
  }

  function hide() {
    root.hidden = true;
    touchHint?.hide();
    parent.removeEventListener('pointerdown', handlePointerDown, true);
    root.removeEventListener('pointerdown', handlePointerDown);
  }

  function destroy() {
    hide();
    root.remove();
  }

  attach();

  return { show, hide, destroy };
}

// iOS Safari re-dispatches the starting tap to whatever is under the finger
// once the overlay is hidden: the touch events and (after touchend) the
// compatibility mouse events hit-test the exposed game canvas and arrive
// there as a fresh tap. preventDefault on pointerdown does not reliably
// suppress them in WebKit, so swallow the rest of the gesture at window
// capture level until the pointer is released.
function swallowGestureTail() {
  const types = ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup', 'click'];
  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const endGesture = () => {
    // one tick late so the trailing touchend/compat mouse events of the
    // same tap are still swallowed
    window.setTimeout(() => {
      for (const type of types) window.removeEventListener(type, swallow, true);
      window.removeEventListener('pointerup', endGesture, true);
      window.removeEventListener('pointercancel', endGesture, true);
    }, 0);
  };

  for (const type of types) {
    window.addEventListener(type, swallow, { capture: true, passive: false });
  }
  window.addEventListener('pointerup', endGesture, true);
  window.addEventListener('pointercancel', endGesture, true);
}

function localizedText(text: LocalizedText): string {
  if (typeof text === 'string') return text;

  const language = getCurrentLanguage();
  return text[language] ?? text.en ?? Object.values(text)[0] ?? '';
}
