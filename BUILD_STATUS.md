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
- Protected renderer remains unchanged during Batch 34; captions use its existing per-shot text overlay contract.

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
- Batch 34 CI structural verification registered.

## EXPERIMENTAL / REQUIRES LIVE ACCEPTANCE
- Image end-to-end production render still requires a real browser acceptance run.
- Mixed-media multi-source Gemini analysis and source-indexed rendering require a real browser acceptance run.
- Automatic generated soundtrack attachment requires a real browser run with working production Lyria credentials/model/quota to verify actual audio playback in the final file.
- Renderer audio mux + beat sync remains structurally verified but needs independent real-browser generated-audio render verification.
- Social export/download/share requires a real Android/browser acceptance run; the export helper preserves the renderer's actual MIME type and does not falsely relabel WebM as MP4.
- Speech captions are structurally integrated and guarded by a UI toggle, but need live verification against real spoken motorcycle/vehicle/person/travel footage and final rendered caption readability.

## NOT YET BUILT
- Licensed/trending-track replacement UX with a persistent rhythm/cue map that can be carried into CapCut/TikTok while preserving intended edit timing.
- Additional true output aspect-ratio render presets beyond the protected 9:16 renderer baseline.
- Full caption styling controls beyond the protected renderer's existing text overlay treatment.
- Complete end-to-end acceptance test across motorcycle/car/person/animal/travel/product/mixed-media examples.
- Deployment synchronization of the latest `main` commits. Production must not be treated as current until Vercel is deliberately reconnected and a fresh deployment reports READY.

## Current acceleration priority
1. Verify the accumulated mixed-media + soundtrack + captions + social-export pipeline in a real browser.
2. Build the licensed/trending-track replacement workflow around the existing beat grid and cut timeline.
3. Add the next highest-value output/render capability without disturbing the protected 9:16 renderer baseline.
4. Complete multi-subject acceptance tests and social output validation.
5. Reconnect GitHub → Vercel only at a stable milestone, deploy once, live-test the accumulated product, and verify again.
