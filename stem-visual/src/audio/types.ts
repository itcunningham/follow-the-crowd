export type StemRole = "drums" | "bass" | "melody" | "vocal" | "fx" | "other";

export const STEM_ROLES: StemRole[] = [
  "drums",
  "bass",
  "melody",
  "vocal",
  "fx",
  "other",
];

export const STEM_LABELS: Record<StemRole, string> = {
  drums: "Drums",
  bass: "Bass",
  melody: "Melody",
  vocal: "Vocal",
  fx: "FX",
  other: "Other",
};

export type StemTrack = {
  id: string;
  name: string;
  role: StemRole;
  file: File;
  buffer: AudioBuffer;
  /** RMS energy 0..1 sampled at `sampleRateHz` */
  envelope: Float32Array;
};

export type MixFrame = {
  time: number;
  levels: Record<StemRole, number>;
};

export const ENVELOPE_HZ = 60;
