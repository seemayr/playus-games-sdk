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
};

class SoundManager {
  private static readonly CDN_BASE = 'https://pub-f2838cca4376431f9c696446d4a3e503.r2.dev';

  private audioContext: AudioContext | null = null;
  private buffers: Map<SoundId, AudioBuffer> = new Map();
  private loading: Map<SoundId, Promise<AudioBuffer | null>> = new Map();
  private enabled = true;

  unlock(): void {
    this.getContext();
  }

  async preload(ids: SoundId | SoundId[]): Promise<void> {
    const idArray = Array.isArray(ids) ? ids : [ids];
    await Promise.all(idArray.map((id) => this.loadSound(id)));
  }

  play(id: SoundId, options: SoundPlayOptions = {}): void {
    if (!this.enabled) return;

    const context = this.getContext();
    if (!context) return;

    this.loadSound(id).then((buffer) => {
      if (!buffer || !this.audioContext) return;

      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

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
        console.warn(`SoundManager: Failed to play ${id}:`, error);
      }
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.buffers.clear();
    this.loading.clear();
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

  private async loadSound(id: SoundId): Promise<AudioBuffer | null> {
    if (this.buffers.has(id)) return this.buffers.get(id)!;
    if (this.loading.has(id)) return this.loading.get(id)!;

    const context = this.getContext();
    if (!context) return null;

    const loadPromise = this.fetchAndDecodeSound(context, id);
    this.loading.set(id, loadPromise);

    return loadPromise.finally(() => this.loading.delete(id));
  }

  private async fetchAndDecodeSound(context: AudioContext, id: SoundId): Promise<AudioBuffer | null> {
    const filename = `${id}.mp3`;
    const urls = [
      `native://sounds/${filename}`,
      `/__native__/sounds/${filename}`,
      `${SoundManager.CDN_BASE}/sounds/${filename}`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        this.buffers.set(id, audioBuffer);
        return audioBuffer;
      } catch {
        continue;
      }
    }

    console.warn(`SoundManager: Could not load ${id}`);
    return null;
  }
}

export const sound = new SoundManager();
