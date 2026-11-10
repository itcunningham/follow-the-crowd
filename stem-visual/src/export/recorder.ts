/** Capture canvas + audio mix to a downloadable WebM for Instagram uploads. */
export class VisualRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  get isRecording(): boolean {
    return this.recorder?.state === "recording";
  }

  start(canvas: HTMLCanvasElement, audioNode: AudioNode, audioCtx: AudioContext): void {
    if (this.isRecording) return;

    const canvasStream = canvas.captureStream(30);
    const dest = audioCtx.createMediaStreamDestination();
    audioNode.connect(dest);

    const tracks = [
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ];
    this.stream = new MediaStream(tracks);

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, {
      mimeType: mime,
      videoBitsPerSecond: 8_000_000,
    });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(250);
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error("Not recording"));
        return;
      }
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: "video/webm" });
        this.cleanup();
        resolve(blob);
      };
      this.recorder.stop();
    });
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
