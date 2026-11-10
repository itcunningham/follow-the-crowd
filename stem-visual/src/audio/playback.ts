import type { StemTrack } from "./types";

export class StemPlayer {
  private ctx: AudioContext;
  private nodes: AudioBufferSourceNode[] = [];
  private master: GainNode;
  private startedAt = 0;
  private offset = 0;
  private playing = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
  }

  get destination(): AudioNode {
    return this.master;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get currentTime(): number {
    if (!this.playing) return this.offset;
    return this.offset + (this.ctx.currentTime - this.startedAt);
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  play(stems: StemTrack[], from = 0): void {
    this.stopSources();
    this.offset = Math.max(0, from);
    this.startedAt = this.ctx.currentTime;
    this.playing = true;

    for (const stem of stems) {
      const src = this.ctx.createBufferSource();
      src.buffer = stem.buffer;
      src.connect(this.master);
      src.start(0, this.offset);
      this.nodes.push(src);
    }
  }

  pause(): void {
    if (!this.playing) return;
    this.offset = this.currentTime;
    this.stopSources();
    this.playing = false;
  }

  stop(): void {
    this.pause();
    this.offset = 0;
  }

  private stopSources(): void {
    for (const n of this.nodes) {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
      n.disconnect();
    }
    this.nodes = [];
  }
}
