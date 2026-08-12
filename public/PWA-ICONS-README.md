# PWA Icons — Production Prerequisite

## Current Status

The following placeholder icon files exist:
- `icon-192.png` — 192×192 placeholder (FTC branding mock-up)
- `icon-512.png` — 512×512 placeholder (FTC branding mock-up)
- `icon-maskable-192.png` — 192×192 adaptive icon placeholder
- `icon-maskable-512.png` — 512×512 adaptive icon placeholder

These are **beta placeholders** created from a green circle + "FTC" text for development/testing only.

## What Needs to Happen Before Production

**The PWA icons must be replaced with the actual Follow The Crowd brand assets.**

### Why This Matters

1. **Home Screen Visibility:** iOS/Android users will see this icon on their Home Screen when the app is installed
2. **Notification Badges:** Push notifications may display this icon
3. **App Recognition:** The icon is how users identify the app among others
4. **Brand Consistency:** Should match the actual Follow The Crowd visual identity

### Finding the Canonical Logo

Search the repository or design assets for:
- `Follow The Crowd` logo file (SVG, PNG, AI, or design tool export)
- Official app icon/brand mark
- Official color palette/brand guide
- Design team assets or Figma/Adobe files

### Icon Requirements

**Minimum set (required):**
- `icon-192.png` — 192×192 pixels, any format
- `icon-512.png` — 512×512 pixels, any format
- `icon-maskable-192.png` — 192×192 "maskable" (transparent bg, subject centered)
- `icon-maskable-512.png` — 512×512 "maskable"

**Optional (not in current manifest):**
- Apple touch icon for iOS Home Screen
- Custom icon for Android adaptive icon

### How to Replace

1. Source the canonical Follow The Crowd icon/logo
2. If only SVG exists, export to PNG at required sizes
3. For maskable versions: ensure transparent background, keep subject centered with padding
4. Save directly to `public/icon-*.png`, overwriting the placeholders
5. Manifest (`public/manifest.json`) already references these files

### If No Canonical Logo Exists

If the Follow The Crowd logo hasn't been designed yet:

1. **Do not proceed to production** — users need a real icon
2. **Option A:** Design a proper logo and icon set
3. **Option B:** Use a temporary professional icon from a stock source
4. **Then:** Replace the placeholders before beta launch

## Manifest Configuration

Current manifest already expects these icons:
```json
{
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

No changes needed there — just replace the files.

## iOS Home Screen Metadata

Next.js (`app/layout.tsx`) already includes PWA metadata:
- Viewport configuration
- Theme colors
- Favicon/app icon references
- Standalone display mode

iOS will use `icon-192.png` or the favicon as the Home Screen icon if no Apple touch icon is specified.

## Testing After Replacement

After replacing with real icons:
1. Run `npm run build` to verify no errors
2. Test on iOS: Add to Home Screen and verify icon appears
3. Test on Android: Install as PWA and verify icon appears
4. Send test notification and verify badge/notification icon displays correctly

## Timeline

**Before:** Beta feature freeze / production deployment
**Status:** BLOCKING — do not ship to users with placeholder icon
**Action:** Replace with canonical Follow The Crowd branding
