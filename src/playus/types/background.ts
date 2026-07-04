/**
 * Background configuration for games
 *
 * Games run in iOS WKWebView where transparent backgrounds let the native
 * iOS UI show through. When a game doesn't need transparency, using a solid
 * color can provide minor performance improvements by skipping alpha blending.
 *
 * @example
 * // Transparent (default) - iOS native background shows through
 * { transparent: true }
 *
 * // Solid color - minor performance optimization
 * { transparent: false, color: '#1a1a2e' }
 */
export type BackgroundConfig =
  | { transparent: true }
  | { transparent: false; color: string };

/**
 * Default: transparent background for iOS native show-through
 */
export const DEFAULT_BACKGROUND: BackgroundConfig = { transparent: true };

/**
 * Check if a background config is transparent
 */
export function isTransparent(config?: BackgroundConfig): boolean {
  return !config || config.transparent;
}

/**
 * Get background color (returns undefined for transparent)
 */
export function getBackgroundColor(config?: BackgroundConfig): string | undefined {
  if (!config || config.transparent === true) return undefined;
  return config.color;
}
