# PWA Icons

## Current status (2026-10-06)

Canonical home-screen mark: cyan **FTC** on navy/black (Canva export).

| File | Use |
|------|-----|
| `icon-192.png` / `icon-512.png` | PWA / Android install |
| `icon-maskable-192.png` / `icon-maskable-512.png` | Android adaptive (mark padded) |
| `apple-touch-icon.png` | iOS Add to Home Screen |
| `app/icon.png` / `app/apple-icon.png` / `app/favicon.ico` | Next metadata + browser tab |
| `docs/marketing/capability-brief/brand/ftc-mark-1080.png` | Source brand mark archive |

Manifest: `public/manifest.json` (`theme_color` / `background_color` `#0a0e14`).

## iOS cache warning

After deploy, **delete** the old Home Screen icon on each phone, then Safari → Share → **Add to Home Screen** again. iOS often keeps the old icon until re-added.

## Replacing later

1. Drop a new square PNG/JPG mark into the brand folder.
2. Regenerate sizes with sharp (see git history for the generator snippet) or export 192/512/180 from Canva.
3. Overwrite the `public/icon-*.png` + `apple-touch-icon.png` + `app/icon.png` / `app/apple-icon.png` / `app/favicon.ico`.
4. Ship to `main`. Re-add Home Screen icons on devices.
