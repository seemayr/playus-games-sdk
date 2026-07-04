export type TesterEvent = {
  type: string;
  direction: 'game-to-host' | 'host-to-game';
  timestamp: number;
  payload: Record<string, unknown>;
  warning?: string;
};

export type HostReadyPayload = {
  handshakeId: string;
  bridgeVersion: number;
  platform: 'dev';
  timestamp: number;
  appVersion: string;
};

type HostReadyResult = {
  success: boolean;
  error?: string;
};

type BridgeEmulatorOptions = {
  sendHostReady: (payload: HostReadyPayload) => HostReadyResult;
};

type GameMessage = {
  source?: string;
  type?: string;
  timestamp?: number;
  [key: string]: unknown;
};

const GAME_EVENT_SOURCES = new Set([
  'game-native-bridge',
  'playus-devkit-game-event',
]);
const HOST_BRIDGE_VERSION = 3;
const HOST_READY_ACK_TIMEOUT_MS = 3000;

export class BridgeEmulator {
  private events: TesterEvent[] = [];
  private listeners: Array<(events: TesterEvent[]) => void> = [];
  private hasReady = false;
  private hasHostReadyAck = false;
  private hasStarted = false;
  private hasFinished = false;
  private score: number | null = null;
  private pendingHandshakeId: string | null = null;
  private ackTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: BridgeEmulatorOptions) {
    window.addEventListener('message', this.handleMessage);
  }

  onChange(listener: (events: TesterEvent[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.events);

    return () => {
      this.listeners = this.listeners.filter((candidate) => candidate !== listener);
    };
  }

  clear() {
    this.cancelAckTimeout();
    this.events = [];
    this.hasReady = false;
    this.hasHostReadyAck = false;
    this.hasStarted = false;
    this.hasFinished = false;
    this.score = null;
    this.pendingHandshakeId = null;
    this.notify();
  }

  getState() {
    return {
      hasReady: this.hasReady,
      hasHostReadyAck: this.hasHostReadyAck,
      hasStarted: this.hasStarted,
      hasFinished: this.hasFinished,
      score: this.score,
    };
  }

  destroy() {
    this.cancelAckTimeout();
    window.removeEventListener('message', this.handleMessage);
    this.listeners = [];
  }

  private readonly handleMessage = (event: MessageEvent<GameMessage>) => {
    if (!event.data?.source || !GAME_EVENT_SOURCES.has(event.data.source)) return;

    const message = event.data;
    const type = message.type ?? 'unknown';
    const warning = this.validateEvent(type, message);

    this.addEvent({
      type,
      direction: 'game-to-host',
      timestamp: message.timestamp ?? Date.now(),
      payload: { ...message },
      warning,
    });

    if (type === 'ready' && !warning) {
      this.sendHostReady(message);
    }
  };

  private validateEvent(type: string, payload: Record<string, unknown>): string | undefined {
    if (type === 'ready') {
      if (this.hasReady) return 'ready() was sent more than once.';
      if (typeof payload.handshakeId !== 'string' || payload.handshakeId.length === 0) {
        return 'ready() must include a handshakeId from the Playus SDK.';
      }
      const bridgeVersion = Number(payload.bridgeVersion);
      if (!Number.isFinite(bridgeVersion) || bridgeVersion < HOST_BRIDGE_VERSION) {
        return `ready() uses bridgeVersion ${payload.bridgeVersion}; expected ${HOST_BRIDGE_VERSION} or newer.`;
      }

      this.hasReady = true;
      this.pendingHandshakeId = payload.handshakeId;
      return undefined;
    }

    if (type === 'hostReadyAck') {
      if (!this.pendingHandshakeId) return 'hostReadyAck was sent without a pending hostReady handshake.';
      if (payload.handshakeId !== this.pendingHandshakeId) {
        return 'hostReadyAck handshakeId does not match the ready() handshakeId.';
      }

      this.cancelAckTimeout();
      this.hasHostReadyAck = true;
      this.pendingHandshakeId = null;
      return undefined;
    }

    if (type === 'gameStarted') {
      if (!this.hasReady) return 'started() was sent before ready().';
      if (!this.hasHostReadyAck) return 'started() was sent before hostReadyAck.';
      if (this.hasStarted) return 'started() was sent more than once.';
      if (this.hasFinished) return 'started() was sent after finished().';
      this.hasStarted = true;
      return undefined;
    }

    if (type === 'scoreUpdate') {
      const score = Number(payload.score);
      if (!Number.isFinite(score)) return 'score() must send a finite number.';
      this.score = score;
      if (!this.hasReady) return 'score() was sent before ready().';
      if (this.hasFinished) return 'score() was sent after finished().';
      return undefined;
    }

    if (type === 'gameFinished') {
      const score = Number(payload.score);
      if (!Number.isFinite(score)) return 'finished() must send a finite final score.';
      this.score = score;
      if (!this.hasReady) return 'finished() was sent before ready().';
      if (!this.hasHostReadyAck) return 'finished() was sent before hostReadyAck.';
      if (this.hasFinished) return 'finished() was sent more than once.';
      this.hasFinished = true;
      return undefined;
    }

    if (type === 'error' || type === 'haptic' || type === 'colorConfig' || type === 'message' || type === 'debugMessage') {
      return undefined;
    }

    return undefined;
  }

  private sendHostReady(message: Record<string, unknown>) {
    const handshakeId = String(message.handshakeId);
    const payload: HostReadyPayload = {
      handshakeId,
      bridgeVersion: HOST_BRIDGE_VERSION,
      platform: 'dev',
      timestamp: Date.now(),
      appVersion: 'playus-host-simulator',
    };

    this.addEvent({
      type: 'hostReady',
      direction: 'host-to-game',
      timestamp: payload.timestamp,
      payload,
    });

    this.startAckTimeout(handshakeId);

    const result = this.options.sendHostReady(payload);
    if (!result.success) {
      this.addEvent({
        type: 'hostReadyFailed',
        direction: 'host-to-game',
        timestamp: Date.now(),
        payload: { ...payload, error: result.error ?? 'unknown' },
        warning: result.error ?? 'hostReady failed.',
      });
    }
  }

  private startAckTimeout(handshakeId: string) {
    this.cancelAckTimeout();
    this.ackTimeout = window.setTimeout(() => {
      if (this.pendingHandshakeId !== handshakeId) return;

      this.addEvent({
        type: 'hostReadyAckTimeout',
        direction: 'host-to-game',
        timestamp: Date.now(),
        payload: { handshakeId },
        warning: 'hostReadyAck was not received within 3 seconds.',
      });
    }, HOST_READY_ACK_TIMEOUT_MS);
  }

  private cancelAckTimeout() {
    if (!this.ackTimeout) return;
    window.clearTimeout(this.ackTimeout);
    this.ackTimeout = null;
  }

  private addEvent(event: TesterEvent) {
    this.events = [...this.events, event];
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.events);
    }
  }
}
