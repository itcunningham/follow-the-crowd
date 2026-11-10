import { buildEnvelope } from "./analyze";
import type { StemRole, StemTrack } from "./types";

/** Synthetic multi-stem demo so the tool works before Ableton exports. */
export async function createDemoStems(
  audioCtx: AudioContext,
  seconds = 16,
): Promise<StemTrack[]> {
  const sr = audioCtx.sampleRate;
  const n = Math.floor(sr * seconds);

  const make = (
    role: StemRole,
    name: string,
    fill: (data: Float32Array, sr: number) => void,
  ): StemTrack => {
    const buffer = audioCtx.createBuffer(1, n, sr);
    const data = buffer.getChannelData(0);
    fill(data, sr);
    return {
      id: crypto.randomUUID(),
      name,
      role,
      file: new File([], `${name}.wav`),
      buffer,
      envelope: buildEnvelope(buffer),
    };
  };

  const drums = make("drums", "demo-drums", (data, sampleRate) => {
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const beat = t % 0.5;
      const kick = beat < 0.05 ? Math.sin(2 * Math.PI * 55 * t) * (1 - beat / 0.05) : 0;
      const hat =
        Math.abs((t * 8) % 1) < 0.04
          ? (Math.random() * 2 - 1) * 0.18 * (1 - ((t * 8) % 1) / 0.04)
          : 0;
      data[i] = kick * 0.9 + hat;
    }
  });

  const bass = make("bass", "demo-bass", (data, sampleRate) => {
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const note = t % 2 < 1 ? 55 : 73.42;
      const env = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.5 * t);
      data[i] = Math.sin(2 * Math.PI * note * t) * 0.35 * env;
    }
  });

  const melody = make("melody", "demo-melody", (data, sampleRate) => {
    const notes = [220, 246.94, 277.18, 329.63, 277.18, 246.94];
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const idx = Math.floor(t * 2) % notes.length;
      const local = (t * 2) % 1;
      const env = local < 0.7 ? Math.sin(Math.PI * (local / 0.7)) : 0;
      data[i] = Math.sin(2 * Math.PI * notes[idx] * t) * 0.22 * env;
    }
  });

  const vocal = make("vocal", "demo-vocal", (data, sampleRate) => {
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const phrase = t % 4;
      const on = phrase > 0.4 && phrase < 2.6;
      const vib = 1 + 0.01 * Math.sin(2 * Math.PI * 5.5 * t);
      const formant =
        Math.sin(2 * Math.PI * 180 * t * vib) * 0.35 +
        Math.sin(2 * Math.PI * 360 * t * vib) * 0.2;
      data[i] = on ? formant * 0.45 : 0;
    }
  });

  const fx = make("fx", "demo-fx", (data, sampleRate) => {
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const sweep = ((t % 8) / 8) * 1200 + 200;
      const riser = (t % 8) / 8;
      data[i] =
        Math.sin(2 * Math.PI * sweep * t) * 0.08 * riser * riser +
        (Math.random() * 2 - 1) * 0.02 * riser;
    }
  });

  return [drums, bass, melody, vocal, fx];
}
