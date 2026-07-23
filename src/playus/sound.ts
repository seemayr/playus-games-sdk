export type SoundId =
  | 'ball-hole'
  | 'game-info'
  | 'game-warning'
  | 'hit-analog'
  | 'jump'
  | 'knife-throw'
  | 'level-complete'
  | 'level-up'
  | 'negative-input'
  | 'piano1'
  | 'piano2'
  | 'piano3'
  | 'piano4'
  | 'pop-bubble'
  | 'pop-happy'
  | 'pop-sharp'
  | 'pop-multi-up'
  | 'pop-multi-down'
  | 'positive-input'
  | 'ring-down'
  | 'ring-up'
  | 'wall-hit-2'
  | 'wall-hit';

export type SoundPlayOptions = {
  volume?: number;
  /**
   * Pitch shift in semitones (e.g. `7` = a fifth up, `-12` = an octave down).
   * Implemented via playback rate, so pitched-up sounds also play faster and
   * pitched-down sounds slower — natural for short one-shot samples, roughly
   * ±12 semitones before it sounds artificial.
   */
  semitones?: number;
};

type NavigatorAudioSession = {
  type: 'transient';
};

const CDN_BASE = 'https://pub-f2838cca4376431f9c696446d4a3e503.r2.dev';

function configureTransientAudioSession(): void {
  const audioSession = (
    navigator as Navigator & { audioSession?: NavigatorAudioSession }
  ).audioSession;

  if (!audioSession) return;

  try {
    audioSession.type = 'transient';
  } catch (error) {
    console.warn('SoundManager: Could not configure transient audio session:', error);
  }
}

function sharedSoundUrls(id: SoundId): string[] {
  const filename = `${id}.mp3`;
  return [
    `native://sounds/${filename}`,
    `/__native__/sounds/${filename}`,
    `${CDN_BASE}/sounds/${filename}`,
  ];
}

class SoundManager {
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private loading: Map<string, Promise<AudioBuffer | null>> = new Map();
  private enabled = true;
  private enabledListeners: Array<(enabled: boolean) => void> = [];

  constructor() {
    configureTransientAudioSession();
  }

  async preload(ids: SoundId | SoundId[]): Promise<void> {
    const idArray = Array.isArray(ids) ? ids : [ids];
    await Promise.all(idArray.map((id) => this.load(id, sharedSoundUrls(id))));
  }

  /** Preload custom sound files bundled with the game. */
  async preloadUrl(sources: string | URL | Array<string | URL>): Promise<void> {
    const list = Array.isArray(sources) ? sources : [sources];
    await Promise.all(list.map((source) => this.load(String(source), [String(source)])));
  }

  play(id: SoundId, options: SoundPlayOptions = {}): void {
    this.playFrom(id, sharedSoundUrls(id), options);
  }

  /**
   * Play a custom sound file bundled with the game. Goes through the same
   * manager as shared sounds, so the host mute state applies automatically.
   */
  playUrl(source: string | URL, options: SoundPlayOptions = {}): void {
    this.playFrom(String(source), [String(source)], options);
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;

    this.enabled = enabled;
    for (const listener of this.enabledListeners) listener(enabled);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Subscribe to the host mute state, e.g. to mute your own audio engine.
   * Calls the listener immediately with the current state and again on every
   * change. Returns an unsubscribe function.
   */
  onEnabledChange(listener: (enabled: boolean) => void): () => void {
    this.enabledListeners.push(listener);
    listener(this.enabled);

    return () => {
      this.enabledListeners = this.enabledListeners.filter((candidate) => candidate !== listener);
    };
  }

  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.buffers.clear();
    this.loading.clear();
    this.enabledListeners = [];
  }

  private playFrom(key: string, urls: string[], options: SoundPlayOptions): void {
    if (!this.enabled) return;

    const context = this.getContext();
    if (!context) return;

    this.load(key, urls).then((buffer) => {
      if (!buffer || !this.audioContext) return;

      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        if (options.semitones) {
          source.playbackRate.value = 2 ** (options.semitones / 12);
        }

        if (options.volume !== undefined && options.volume !== 1) {
          const gainNode = this.audioContext.createGain();
          gainNode.gain.value = Math.max(0, Math.min(1, options.volume));
          source.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
        } else {
          source.connect(this.audioContext.destination);
        }

        source.start(0);
      } catch (error) {
        console.warn(`SoundManager: Failed to play ${key}:`, error);
      }
    });
  }

  private getContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextCtor();
      } catch {
        console.warn('SoundManager: Web Audio API not supported');
        return null;
      }
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return this.audioContext;
  }

  private async load(key: string, urls: string[]): Promise<AudioBuffer | null> {
    if (this.buffers.has(key)) return this.buffers.get(key)!;
    if (this.loading.has(key)) return this.loading.get(key)!;

    const context = this.getContext();
    if (!context) return null;

    const loadPromise = this.fetchAndDecode(context, key, urls);
    this.loading.set(key, loadPromise);

    return loadPromise.finally(() => this.loading.delete(key));
  }

  private async fetchAndDecode(context: AudioContext, key: string, urls: string[]): Promise<AudioBuffer | null> {
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        this.buffers.set(key, audioBuffer);
        return audioBuffer;
      } catch {
        continue;
      }
    }

    console.warn(`SoundManager: Could not load ${key}`);
    return null;
  }
}

export const sound = new SoundManager();
