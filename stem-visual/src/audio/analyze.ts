import { ENVELOPE_HZ, type StemRole, type StemTrack } from "./types";

function guessRole(name: string): StemRole {
  const n = name.toLowerCase();
  if (/drum|kick|snare|hat|perc|break|beat/.test(n)) return "drums";
  if (/bass|808|sub/.test(n)) return "bass";
  if (/vocal|vox|voice|acapella|sing/.test(n)) return "vocal";
  if (/fx|riser|sweep|noise|amb|atmos/.test(n)) return "fx";
  if (/lead|melod|synth|keys|piano|guitar|arp|pluck/.test(n)) return "melody";
  return "other";
}

/** Build a per-frame RMS envelope for one decoded stem. */
export function buildEnvelope(
  buffer: AudioBuffer,
  sampleRateHz = ENVELOPE_HZ,
): Float32Array {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const hop = Math.max(1, Math.floor(buffer.sampleRate / sampleRateHz));
  const frames = Math.ceil(length / hop);
  const out = new Float32Array(frames);

  const chans: Float32Array[] = [];
  for (let c = 0; c < channels; c++) chans.push(buffer.getChannelData(c));

  let peak = 1e-9;
  for (let i = 0; i < frames; i++) {
    const start = i * hop;
    const end = Math.min(length, start + hop);
    let sum = 0;
    let count = 0;
    for (let s = start; s < end; s++) {
      let sample = 0;
      for (let c = 0; c < channels; c++) sample += chans[c][s];
      sample /= channels;
      sum += sample * sample;
      count++;
    }
    const rms = Math.sqrt(sum / Math.max(1, count));
    out[i] = rms;
    if (rms > peak) peak = rms;
  }

  // Normalize + mild compression so quiet stems still move something
  for (let i = 0; i < frames; i++) {
    const n = out[i] / peak;
    out[i] = Math.pow(Math.min(1, n * 1.35), 0.72);
  }
  return out;
}

export async function decodeStemFile(
  file: File,
  audioCtx: AudioContext,
): Promise<StemTrack> {
  const raw = await file.arrayBuffer();
  const buffer = await audioCtx.decodeAudioData(raw.slice(0));
  return {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ""),
    role: guessRole(file.name),
    file,
    buffer,
    envelope: buildEnvelope(buffer),
  };
}

export function sampleEnvelope(
  envelope: Float32Array,
  timeSec: number,
  sampleRateHz = ENVELOPE_HZ,
): number {
  if (envelope.length === 0) return 0;
  const idx = timeSec * sampleRateHz;
  const i0 = Math.floor(idx);
  const i1 = Math.min(envelope.length - 1, i0 + 1);
  if (i0 < 0) return envelope[0] ?? 0;
  if (i0 >= envelope.length - 1) return envelope[envelope.length - 1] ?? 0;
  const t = idx - i0;
  return envelope[i0] * (1 - t) + envelope[i1] * t;
}

export function levelsAtTime(
  stems: StemTrack[],
  timeSec: number,
): Record<StemRole, number> {
  const levels: Record<StemRole, number> = {
    drums: 0,
    bass: 0,
    melody: 0,
    vocal: 0,
    fx: 0,
    other: 0,
  };
  for (const stem of stems) {
    const v = sampleEnvelope(stem.envelope, timeSec);
    levels[stem.role] = Math.max(levels[stem.role], v);
  }
  return levels;
}

export function longestDuration(stems: StemTrack[]): number {
  return stems.reduce((m, s) => Math.max(m, s.buffer.duration), 0);
}
