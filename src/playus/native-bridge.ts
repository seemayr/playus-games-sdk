import { sound } from './sound';
import { installMobileSelectionPolicy } from './mobile-interaction';

const NATIVE_HANDLER_NAME = 'gameEvent';
const BRIDGE_VERSION = 3;

type HostReadyPayload = {
  handshakeId?: string;
  bridgeVersion?: number;
  platform?: string;
  appVersion?: string;
  timestamp?: number;
};

type NativePostError = 'native_handler_missing' | 'post_failed';

type NativePostResult = {
  success: boolean;
  error?: NativePostError;
};

type HostReadyEvaluationError = NativePostError | 'handshake_mismatch';

type HostReadyEvaluationResult = {
  success: boolean;
  error?: HostReadyEvaluationError;
};

function encodeHostReadyEvaluationResult(result: HostReadyEvaluationResult): string {
  return JSON.stringify(result);
}

function createHandshakeId(): string {
  const cryptoRef = window.crypto;

  if (typeof cryptoRef?.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }

  if (typeof cryptoRef?.getRandomValues === 'function') {
    const values = cryptoRef.getRandomValues(new Uint32Array(2));
    const randomPart = Array.from(values, (value) => value.toString(36)).join('');
    return `${Date.now().toString(36)}-${randomPart}`;
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const EVENTS = {
  // Outgoing to native
  READY: 'ready',
  GAME_STARTED: 'gameStarted',
  GAME_FINISHED: 'gameFinished',
  SCORE_UPDATE: 'scoreUpdate',
  ERROR: 'error',
  HAPTIC: 'haptic',
  COLOR_CONFIG: 'colorConfig',
  MESSAGE: 'message',
  DEBUG_MESSAGE: 'debugMessage',
  HOST_READY_ACK: 'hostReadyAck',
} as const;

function getViewportDetails() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

export class ColorConfig {
  assetPrimaryColor?: string;
  assetDarkColor?: string;

  backgroundGradientTop?: string;
  backgroundGradientBottom?: string;
  constructor(init: Partial<ColorConfig> = {}) {
    Object.assign(this, init);
  }
}

const SCORE_THROTTLE_MS = 200;
const SCORE_DECIMAL_DIGITS = 7;
const SCORE_DECIMAL_FACTOR = 10 ** SCORE_DECIMAL_DIGITS;
const MAX_ROUNDABLE_SCORE = Number.MAX_SAFE_INTEGER / SCORE_DECIMAL_FACTOR;

export function roundScoreForBridge(score: number): number {
  if (!Number.isFinite(score)) return score;
  if (Math.abs(score) >= MAX_ROUNDABLE_SCORE) return score;

  const rounded =
    Math.sign(score) * Math.round(Math.abs(score) * SCORE_DECIMAL_FACTOR) / SCORE_DECIMAL_FACTOR;

  return Object.is(rounded, -0) ? 0 : rounded;
}

export class NativeBridge {
  private gameId?: string;
  private readonly handshakeId = createHandshakeId();
  private pendingScore: number | null = null;
  private scoreTimer: ReturnType<typeof setTimeout> | null = null;

  configure(options: { gameId?: string } = {}) {
    this.gameId = options.gameId ?? this.gameId;
  }

  private postToNative(event: any): NativePostResult {
    const ios = (window as any).webkit?.messageHandlers?.[NATIVE_HANDLER_NAME];
    const android = (window as any).gameEvent;
    let error: NativePostError = 'native_handler_missing';

    try {
      if (ios && typeof ios.postMessage === 'function') {
        ios.postMessage(event);
        return { success: true };
      }
      if (android && typeof android.handleMessage === 'function') {
        // Android @JavascriptInterface erwartet einen String
        android.handleMessage(JSON.stringify(event));
        return { success: true };
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('NativeBridge post failed:', e);
      error = 'post_failed';
    }

    // Browser fallback for the local Playus host simulator.
    // eslint-disable-next-line no-console
    console.log('NativeBridge (simulated) →', event);

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          source: 'game-native-bridge',
          ...event
        }, '*');
      }
    } catch (e) {
      // Ignore postMessage errors (might fail in some contexts)
    }

    return { success: false, error };
  }

  private postDetailed(type: string, payload?: any): NativePostResult {
    try {
      const event = {
        type,
        gameId: this.gameId,
        timestamp: Date.now(),
        ...payload,
      };
      return this.postToNative(event);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`NativeBridge post failed for "${type}"`, err);
      return { success: false, error: 'post_failed' };
    }
  }

  // Low-level post (generic) – posts to native container
  post(type: string, payload?: any): boolean {
    return this.postDetailed(type, payload).success;
  }

  private installGameAPI() {
    const self = this;
    (window as any).gameAPI = {
      hostReady(payload?: HostReadyPayload): string {
        if (payload?.handshakeId !== self.handshakeId) {
          // eslint-disable-next-line no-console
          console.warn('NativeBridge hostReady ignored:', payload);
          return encodeHostReadyEvaluationResult({
            success: false,
            error: 'handshake_mismatch',
          });
        }

        // eslint-disable-next-line no-console
        console.info('NativeBridge hostReady:', payload);
        const postResult = self.postDetailed(EVENTS.HOST_READY_ACK, {
          handshakeId: self.handshakeId,
          bridgeVersion: BRIDGE_VERSION,
        });

        if (!postResult.success) {
          // hostReadyAck is observability-only. The game received hostReady, so
          // native ack delivery must not block the game from starting.
          // eslint-disable-next-line no-console
          console.warn('NativeBridge hostReadyAck post failed:', postResult.error);
        }

        return encodeHostReadyEvaluationResult({ success: true });
      },
      setMuted(muted: boolean) {
        sound.setEnabled(!muted);
      },
      unlockAudio() {
        sound.unlock();
      },
    };
  }

  private flushScore() {
    if (this.scoreTimer) {
      clearTimeout(this.scoreTimer);
      this.scoreTimer = null;
    }
    if (this.pendingScore !== null) {
      this.post(EVENTS.SCORE_UPDATE, { score: roundScoreForBridge(this.pendingScore) });
      this.pendingScore = null;
    }
  }

  attach() {
    this.installGameAPI();
    // Games should explicitly call nativeBridge.game.ready() when ready.
  }

  // Typed convenience API for games → native
  readonly game = {
    ready: (details?: { gameId?: string; version?: string; timestamp?: number }) => {
      if (details?.gameId) this.gameId = details.gameId;
      this.post(EVENTS.READY, {
        userAgent: navigator.userAgent,
        viewport: getViewportDetails(),
        ...details,
        bridgeVersion: BRIDGE_VERSION,
        handshakeId: this.handshakeId,
      });
    },
    started: () => {
      this.post(EVENTS.GAME_STARTED);
    },
    finished: (score: number) => {
      this.flushScore();
      this.post(EVENTS.GAME_FINISHED, { score: roundScoreForBridge(score) });
    },
    score: (score: number) => {
      this.pendingScore = score;
      if (!this.scoreTimer) {
        this.scoreTimer = setTimeout(() => this.flushScore(), SCORE_THROTTLE_MS);
      }
    },
    error: (error: { code: string; message: string } | string) => {
      // Support both structured error objects and simple strings for backward compatibility
      const errorPayload = typeof error === 'string'
        ? { code: 'UNKNOWN', message: error }
        : { code: error.code, message: error.message };
      this.post(EVENTS.ERROR, errorPayload);
    },
    setColorConfig: (config: ColorConfig) => {
      this.post(EVENTS.COLOR_CONFIG, { colorConfig: config });
    },
    message: (text: string, duration?: number) => {
      this.post(EVENTS.MESSAGE, { text, ...(duration !== undefined && { duration }) });
    },
    debugMessage: (text: string) => {
      this.post(EVENTS.DEBUG_MESSAGE, { text });
    }
  };

  // Device features exposed to games → native
  readonly device = {
    // Triggers a haptic pattern on the host device
    haptic: (
      pattern: 'tap' | 'release' | 'soft' | 'startLoading' | 'success' | 'failed' | 'confetti'
    ) => {
      this.post(EVENTS.HAPTIC, { pattern });
    },
  };

}

export const nativeBridge = new NativeBridge();
installMobileSelectionPolicy();
nativeBridge.attach();
