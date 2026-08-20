# Bikeztagram AI — Build Status

Updated: 2026-08-20

## VERIFIED / PROTECTED
- Existing verified video Blob/Gemini intake path.
- Gemini director/production planning pipeline.
- Vercel Blob upload infrastructure and authentication contract.
- Existing browser renderer and world-bridge infrastructure.
- GitHub `main` as the source of truth.
- Beat/BPM/energy analysis contracts and beat-aware editorial timing.
- Original-music generation bridge and licensed/trending replacement mapping.
- Browser render QA: decode, playback and sampled-frame inspection.
- Subject-agnostic architecture: motorcycle remains the stress-test dataset, not the architecture.
- Vercel project remains intact; Git connection stays disconnected during acceleration so development commits do not trigger deployments.
- Protected 1080×1920 renderer remains intact; Batch 36 changes only the audio bridge and replacement-map semantics around it.

## BUILT / TESTED
- Autonomous render → inspect → revise → re-render orchestration (`src/renderQualityLoop.js`) with bounded attempts and deterministic QA revisions.
- QA-driven luminance correction for dark/black output.
- QA-driven editorial duration correction.
- Renderer playback/decode failure detection with bounded retry behaviour.
- Batch 29 structural verification for the render quality loop.
- Image Blob intake accepts JPEG/PNG/WebP/GIF/HEIC/HEIF alongside protected video formats.
- Image Gemini Stage-1 analysis is integrated into the same AI Director → production blueprint → browser render flow.
- Batch 30 universal image-intake verification.
- Batch 31 true mixed-media source-library architecture: up to 12 images/videos can be selected together, uploaded to Blob, analysed together by Gemini, directed into a source-indexed edit plan, and passed to the existing render → inspect → improve pipeline.
- Batch 32 automatic original-soundtrack generation/attachment bridge with audio analysis and beat-aware renderer integration; safe planning fallback remains available when live Lyria audio is unavailable.
- Batch 33 finished-film social export controls: the current protected renderer output is 1080×1920 portrait (9:16), with browser download and supported Android/browser native video sharing.
- Batch 34 verified speech-caption bridge: optional automatic speech detection for single uploaded videos, Gemini time-coded caption cues, confidence filtering, and attachment to real AI Director shots without changing source media or renderer infrastructure.
- Batch 35 licensed/trending-track replacement workflow: exports a copyright-safe rhythm map containing edit timings, source timing, speed, transitions and available beat-grid metadata so the generated/original soundtrack can be swapped later in CapCut/TikTok without losing the intended edit rhythm.
- Batch 36 beat-sync correctness fix: music alignment now operates on the finished-edit timeline while preserving each real source video's `startTime`; replacement maps distinguish edit timing from source-media offsets; soundtrack playback is explicitly started before MediaRecorder capture.
- Batch 34, Batch 35 and Batch 36 verification coverage registered in package scripts.
- Batch 36 regression test executed successfully against the beat-sync and replacement-map logic.

## EXPERIMENTAL / REQUIRES LIVE ACCEPTANCE
- Image end-to-end production render still requires a real browser acceptance run.
- Mixed-media multi-source Gemini analysis and source-indexed rendering require a real browser acceptance run.
- Automatic generated soundtrack attachment now explicitly starts the generated audio before capture, but requires a real browser run with working production Lyria credentials/model/quota to verify actual audio playback and final-file muxing.
- Renderer audio mux + beat sync remains structurally verified and source-offset-safe, but needs independent real-browser generated-audio render verification.
- Social export/download/share requires a real Android/browser acceptance run; the export helper preserves the renderer's actual MIME type and does not falsely relabel WebM as MP4.
- Speech captions are structurally integrated and guarded by a UI toggle, but need live verification against real spoken motorcycle/vehicle/person/travel footage and final rendered caption readability.
- Rhythm replacement map needs live acceptance with a real generated soundtrack and an actual licensed/trending replacement track workflow in CapCut/TikTok.

## NOT YET BUILT
- Additional true output aspect-ratio render presets beyond the protected 9:16 renderer baseline.
- Full caption styling controls beyond the protected renderer's existing text overlay treatment.
- Complete end-to-end acceptance test across motorcycle/car/person/animal/travel/product/mixed-media examples.
- Deployment synchronization of the latest `main` commits. Production must not be treated as current until Vercel is deliberately reconnected and a fresh deployment reports READY.

## Current acceleration priority
1. Live-verify the accumulated mixed-media + soundtrack + captions + rhythm-map + social-export pipeline.
2. Add additional output presets without disturbing the protected 9:16 renderer baseline.
3. Run universal acceptance tests across motorcycle, car, person, animal, travel, landscape and product examples.
4. Reconnect GitHub → Vercel only at a stable milestone, deploy once, live-test the accumulated product, and verify again.
5. Only after end-to-end acceptance, move into final UI/product polish.
