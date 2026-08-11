# Bikeztagram AI — V1

A free-first, browser-local cinematic editor prototype designed for Android and motorcycle content.

## What is genuinely working in this V1

- Android-friendly dark cinematic UI
- Bulk local photo/video selection
- Local media previews
- No permanent cloud upload of source media
- Natural-language director prompt
- Local heuristic edit-plan engine (no paid AI API required)
- Shot scoring architecture using duration, filename hints and media metadata
- Still-frame extraction architecture (best frame can be exported from a video preview)
- Cinematic sequence generation: hook → build → reveal → action → hero → outro
- Local original pulse soundtrack generated in-browser, so no copyrighted music is downloaded
- Browser MP4 rendering with FFmpeg WebAssembly
- 9:16 output
- Timeline preview
- V1/V2/V3 version history
- MAKE IT BETTER pass that critiques the current plan and regenerates a stronger plan
- PWA manifest
- Vercel-ready HTTPS deployment

## Important V1 boundary

This version does **not** pretend to have a cloud multimodal foundation model watching every frame. The local director uses lightweight heuristics and media metadata so the free-first build remains deployable without API bills. The code is structured around `director.js` so a real multimodal model can replace or augment that layer later.

Likewise, the included soundtrack is an original locally generated pulse rather than a scraped/copyrighted track. The `musicProvider.js` module is the intended integration point for a curated catalogue of genuinely licensed/free tracks later.

## Run locally

```bash
npm install
npm run dev
```

Then open the HTTPS Vercel deployment (or the Vite dev URL) in Chrome. For the full FFmpeg path, use a normal HTTP/HTTPS origin — do not open `index.html` directly from `file://`.

## Build

```bash
npm run build
npm run preview
```

The Vite build copies FFmpeg's core JS/WASM/worker assets into `dist/ffmpeg`, so the production app does not depend on a CDN worker and avoids the previous `origin 'null'` worker failure.

## Vercel

Import the GitHub repository into Vercel. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.

No environment variables are required for V1.

## Next upgrade points

1. Replace/augment local shot scoring with a browser-capable vision model or optional server-side AI.
2. Add real frame sampling + perceptual duplicate detection.
3. Add browser-safe stabilisation and beat detection.
4. Add a curated, licence-verified music catalogue.
5. Add a real timeline compositor with text/effects layers.
6. Add optional paid/cloud rendering for larger projects.
