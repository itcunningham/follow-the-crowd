# Stem Visual

Turn Ableton **stems** into a 9:16 Instagram video. Each stem role drives its own visual layer (drums, bass, melody, vocal, fx).

## Run

```bash
cd stem-visual
npm install
npm run dev
```

Open the local URL (default `http://127.0.0.1:5177`).

## Ableton → here

1. Export stems from Ableton (Track freeze/flatten, or Export Audio/Video with stems).
2. Drop the WAVs into the app.
3. Assign roles if auto-detect missed them.
4. Play to preview, then **Record video** for a WebM download.
5. If Instagram rejects WebM, convert to MP4 in CapCut / HandBrake.

## Mapping

| Role   | Visual                          |
|--------|----------------------------------|
| Drums  | Hit rings + flash                |
| Bass   | Warm ground field / scale pulse  |
| Melody | Orbiting teal particles          |
| Vocal  | Center ribbon / form             |
| FX     | Atmospheric grain                |
| Other  | Radial shards                     |

This folder is standalone — it is **not** part of the Follow the Crowd product UI.
