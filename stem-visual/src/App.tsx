import { useEffect, useRef, useState } from "react";
import {
  decodeStemFile,
  levelsAtTime,
  longestDuration,
} from "./audio/analyze";
import { createDemoStems } from "./audio/demo";
import { StemPlayer } from "./audio/playback";
import {
  STEM_LABELS,
  STEM_ROLES,
  type StemRole,
  type StemTrack,
} from "./audio/types";
import { downloadBlob, VisualRecorder } from "./export/recorder";
import { StemRenderer } from "./visual/renderer";

export default function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<StemPlayer | null>(null);
  const rendererRef = useRef<StemRenderer | null>(null);
  const recorderRef = useRef(new VisualRecorder());
  const stemsRef = useRef<StemTrack[]>([]);
  const lastTsRef = useRef<number | null>(null);

  const [stems, setStems] = useState<StemTrack[]>([]);
  const [title, setTitle] = useState("Untitled Track");
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Load Ableton stem WAVs, or run the demo.");
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState({
    drums: 0,
    bass: 0,
    melody: 0,
    vocal: 0,
    fx: 0,
    other: 0,
  });

  stemsRef.current = stems;

  function ensureAudio(): { ctx: AudioContext; player: StemPlayer } {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (!playerRef.current) {
      playerRef.current = new StemPlayer(audioCtxRef.current);
    }
    return { ctx: audioCtxRef.current, player: playerRef.current };
  }

  useEffect(() => {
    const renderer = new StemRenderer(title);
    rendererRef.current = renderer;
    const stage = stageRef.current;
    if (stage) {
      stage.innerHTML = "";
      stage.appendChild(renderer.canvas);
    }
    renderer.draw(
      { drums: 0, bass: 0, melody: 0, vocal: 0, fx: 0, other: 0 },
      0,
      1 / 60,
    );

    let raf = 0;
    const tick = (ts: number) => {
      const last = lastTsRef.current ?? ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      lastTsRef.current = ts;

      const player = playerRef.current;
      const time = player?.currentTime ?? 0;
      const live = levelsAtTime(stemsRef.current, time);
      setLevels(live);
      rendererRef.current?.draw(live, time, dt);

      const duration = longestDuration(stemsRef.current);
      if (player?.isPlaying && duration > 0 && time >= duration) {
        player.pause();
        setPlaying(false);
        if (recorderRef.current.isRecording) {
          void finishRecord();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    rendererRef.current?.setTitle(title);
  }, [title]);

  async function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setError(null);
    try {
      const { ctx } = ensureAudio();
      await ctx.resume();
      const next: StemTrack[] = [];
      for (const file of Array.from(fileList)) {
        next.push(await decodeStemFile(file, ctx));
      }
      setStems((prev) => [...prev, ...next]);
      setStatus(`Loaded ${next.length} stem${next.length === 1 ? "" : "s"}. Assign roles, then Play.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to decode audio");
    } finally {
      setBusy(false);
    }
  }

  async function loadDemo() {
    setBusy(true);
    setError(null);
    try {
      const { ctx, player } = ensureAudio();
      await ctx.resume();
      player.stop();
      setPlaying(false);
      const demo = await createDemoStems(ctx);
      setStems(demo);
      setTitle("Demo Night Drive");
      setStatus("Demo stems loaded — five roles mapped. Hit Play.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo failed");
    } finally {
      setBusy(false);
    }
  }

  async function togglePlay() {
    if (!stems.length) {
      setError("Add stems or load the demo first.");
      return;
    }
    const { ctx, player } = ensureAudio();
    await player.resume();
    await ctx.resume();
    if (player.isPlaying) {
      player.pause();
      setPlaying(false);
      return;
    }
    player.play(stems, player.currentTime);
    setPlaying(true);
    setError(null);
  }

  function stopAll() {
    playerRef.current?.stop();
    setPlaying(false);
  }

  function setRole(id: string, role: StemRole) {
    setStems((prev) => prev.map((s) => (s.id === id ? { ...s, role } : s)));
  }

  function removeStem(id: string) {
    setStems((prev) => prev.filter((s) => s.id !== id));
  }

  async function startRecord() {
    if (!stems.length) {
      setError("Nothing to record.");
      return;
    }
    const { ctx, player } = ensureAudio();
    const renderer = rendererRef.current;
    if (!renderer) return;
    await player.resume();
    player.stop();
    recorderRef.current.start(renderer.canvas, player.destination, ctx);
    player.play(stems, 0);
    setPlaying(true);
    setRecording(true);
    setStatus("Recording 9:16 WebM… will stop at end of longest stem.");
  }

  async function finishRecord() {
    if (!recorderRef.current.isRecording) return;
    try {
      const blob = await recorderRef.current.stop();
      const safe = title.replace(/[^\w\-]+/g, "_").slice(0, 48) || "stem-visual";
      downloadBlob(blob, `${safe}.webm`);
      setStatus("Downloaded WebM. Convert to MP4 in CapCut/HandBrake if Instagram rejects WebM.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Record failed");
    } finally {
      setRecording(false);
      playerRef.current?.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="app">
      <header className="brand">
        <h1>Stem Visual</h1>
        <p>
          Drop Ableton stem exports. Each stem role drives its own visual layer.
          Preview in 9:16, then record a video for Instagram.
        </p>
      </header>

      <div className="stage" ref={stageRef} aria-label="Visual preview" />

      <aside className="panel">
        <h2>Track</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Track title"
          aria-label="Track title"
        />

        <div className="row">
          <label className="file">
            Add stems
            <input
              type="file"
              accept="audio/*,.wav,.aif,.aiff,.mp3,.flac"
              multiple
              disabled={busy}
              onChange={(e) => void onFiles(e.target.files)}
            />
          </label>
          <button type="button" onClick={() => void loadDemo()} disabled={busy}>
            Load demo
          </button>
        </div>

        <div className="row">
          <button
            type="button"
            className="primary"
            onClick={() => void togglePlay()}
            disabled={busy || !stems.length}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={stopAll} disabled={!stems.length}>
            Stop
          </button>
          {!recording ? (
            <button
              type="button"
              className="danger"
              onClick={() => void startRecord()}
              disabled={busy || !stems.length}
            >
              Record video
            </button>
          ) : (
            <button type="button" className="danger" onClick={() => void finishRecord()}>
              Stop & download
            </button>
          )}
        </div>

        <p className="hint">
          From Ableton: export stems (or Freeze/Flatten tracks) as WAV → drop them
          here → set roles (drums/bass/melody/vocal/fx).
        </p>

        <h2>Stems ({stems.length})</h2>
        <div className="stem-list">
          {stems.length === 0 && <p className="hint">No stems yet.</p>}
          {stems.map((stem) => (
            <div className="stem" key={stem.id}>
              <div className="name" title={stem.name}>
                {stem.name}
              </div>
              <select
                value={stem.role}
                aria-label={`Role for ${stem.name}`}
                onChange={(e) => setRole(stem.id, e.target.value as StemRole)}
              >
                {STEM_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {STEM_LABELS[role]}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => removeStem(stem.id)}>
                ×
              </button>
            </div>
          ))}
        </div>

        <h2>Live levels</h2>
        <div className="meters">
          {STEM_ROLES.map((role) => (
            <div className="meter" key={role}>
              <span>{role}</span>
              <div className="bar">
                <span style={{ width: `${Math.round(levels[role] * 100)}%` }} />
              </div>
              <span>{Math.round(levels[role] * 100)}</span>
            </div>
          ))}
        </div>

        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}
      </aside>
    </div>
  );
}
