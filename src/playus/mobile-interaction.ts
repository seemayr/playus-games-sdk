type WebkitStyle = CSSStyleDeclaration & {
  webkitTapHighlightColor?: string;
  webkitTouchCallout?: string;
  webkitUserSelect?: string;
};

const mobilePolicyParams = new URLSearchParams(window.location.search);
const MOBILE_POLICY_DISABLED = hasMobilePolicyFlag('playusNoMobilePolicy');
const TOUCH_DEFAULT_GUARD_DISABLED = hasMobilePolicyFlag('playusNoTouchDefaultGuard');
const TOUCH_ACTION_OVERRIDE = mobilePolicyParams.get('playusTouchAction');

const CONTROL_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable]',
  '[role="button"]',
  '[role="slider"]',
].join(',');

let documentPolicyInstalled = false;
const touchGuardedElements = new WeakSet<HTMLElement>();

export function installMobileSelectionPolicy() {
  if (MOBILE_POLICY_DISABLED) return;
  if (documentPolicyInstalled) return;
  documentPolicyInstalled = true;

  applySelectionStyle(document.documentElement);
  if (document.body) {
    applySelectionStyle(document.body);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) applySelectionStyle(document.body);
    }, { once: true });
  }

  document.addEventListener('selectstart', preventNonControlDefault, true);
  document.addEventListener('contextmenu', preventNonControlDefault, true);
  document.addEventListener('dragstart', preventNonControlDefault, true);
}

export function applyMobileSurfaceStyle<T extends HTMLElement>(element: T): T {
  if (MOBILE_POLICY_DISABLED) return element;

  applySelectionStyle(element);
  element.style.touchAction = TOUCH_ACTION_OVERRIDE || 'none';
  return element;
}

export function installTouchDefaultGuard<T extends HTMLElement>(element: T): T {
  if (MOBILE_POLICY_DISABLED || TOUCH_DEFAULT_GUARD_DISABLED) return element;
  if (touchGuardedElements.has(element)) return element;
  touchGuardedElements.add(element);

  element.addEventListener('touchstart', preventNonControlDefault, { passive: false });
  element.addEventListener('touchmove', preventNonControlDefault, { passive: false });
  return element;
}

// Backward-compatible names for the earlier prototype. These no longer install
// any pointer/touch preventDefault listeners.
export const installMobileInteractionPolicy = installMobileSelectionPolicy;
export function applyMobileInteractionPolicy<T extends HTMLElement>(element: T, _options?: unknown): T {
  return applyMobileSurfaceStyle(element);
}

function applySelectionStyle(element: HTMLElement) {
  const style = element.style as WebkitStyle;
  style.userSelect = 'none';
  style.webkitUserSelect = 'none';
  style.webkitTouchCallout = 'none';
  style.webkitTapHighlightColor = 'transparent';
  style.overscrollBehavior = 'none';
}

function hasMobilePolicyFlag(name: string): boolean {
  const value = mobilePolicyParams.get(name);
  return value === '' || value === '1' || value === 'true';
}

function preventNonControlDefault(event: Event) {
  if (isControlTarget(event.target)) return;
  event.preventDefault();
}

function isControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(CONTROL_SELECTOR) !== null;
}
