export type CanvasSize = {
  width: number;
  height: number;
  devicePixelRatio: number;
};

export type ObserveCanvasSizeOptions = {
  canvas: HTMLCanvasElement;
  container: Element;
  maxDevicePixelRatio?: number;
  onResize: (size: CanvasSize) => void;
};

const DEFAULT_MAX_DEVICE_PIXEL_RATIO = 2;

/**
 * Keeps an existing canvas backing store in sync with its displayed container.
 * Width and height passed to onResize are CSS pixels; devicePixelRatio is capped.
 */
export function observeCanvasSize(options: ObserveCanvasSizeOptions): () => void {
  const maxDevicePixelRatio = options.maxDevicePixelRatio ?? DEFAULT_MAX_DEVICE_PIXEL_RATIO;
  if (!Number.isFinite(maxDevicePixelRatio) || maxDevicePixelRatio <= 0) {
    throw new RangeError('maxDevicePixelRatio must be a finite number greater than 0');
  }

  let currentSize: CanvasSize | undefined;
  let stopped = false;

  const update = (): boolean => {
    if (stopped) return false;

    const bounds = options.container.getBoundingClientRect();
    const width = positiveSize(bounds.width) ?? positiveSize(window.innerWidth);
    const height = positiveSize(bounds.height) ?? positiveSize(window.innerHeight);
    if (
      width === undefined
      || height === undefined
    ) {
      return false;
    }

    const devicePixelRatio = Math.min(getDevicePixelRatio(), maxDevicePixelRatio);
    const size = {
      width,
      height,
      devicePixelRatio,
    };

    if (
      currentSize?.width === size.width
      && currentSize.height === size.height
      && currentSize.devicePixelRatio === size.devicePixelRatio
    ) {
      return true;
    }

    currentSize = size;

    const backingWidth = Math.round(size.width * size.devicePixelRatio);
    const backingHeight = Math.round(size.height * size.devicePixelRatio);
    if (options.canvas.width !== backingWidth) options.canvas.width = backingWidth;
    if (options.canvas.height !== backingHeight) options.canvas.height = backingHeight;

    options.onResize(size);
    return true;
  };

  const hasInitialSize = update();

  const resizeObserver = typeof ResizeObserver === 'undefined'
    ? undefined
    : new ResizeObserver(update);
  resizeObserver?.observe(options.container);

  const visualViewport = window.visualViewport;
  window.addEventListener('resize', update);
  visualViewport?.addEventListener('resize', update);
  const initialFrame = hasInitialSize ? undefined : window.requestAnimationFrame(update);

  return () => {
    if (stopped) return;
    stopped = true;
    resizeObserver?.disconnect();
    window.removeEventListener('resize', update);
    visualViewport?.removeEventListener('resize', update);
    if (initialFrame !== undefined) window.cancelAnimationFrame(initialFrame);
  };
}

function getDevicePixelRatio(): number {
  const devicePixelRatio = window.devicePixelRatio;
  return Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? devicePixelRatio
    : 1;
}

function positiveSize(value: number): number | undefined {
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
