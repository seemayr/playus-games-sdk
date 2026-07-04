import { getCurrentLanguage, type Language } from './i18n';
import { createTouchHint, type TouchHint, type TouchHintType } from './overlay/touch-hint';

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
      width: '24%',
    });
  }

  function handlePointerDown(event: PointerEvent) {
    hide();
    options.onStart(event);
  }

  function show() {
    root.hidden = false;
    touchHint?.show();
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

  if (mode === 'dismiss-only') {
    root.addEventListener('pointerdown', handlePointerDown);
  } else {
    parent.addEventListener('pointerdown', handlePointerDown, true);
  }

  return { show, hide, destroy };
}

function localizedText(text: LocalizedText): string {
  if (typeof text === 'string') return text;

  const language = getCurrentLanguage();
  return text[language] ?? text.en ?? Object.values(text)[0] ?? '';
}
