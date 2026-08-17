# AI video model selection policy

We continuously evaluate the best open/free route rather than locking Bikeztagram to one model.

## Current decision

### Proof/default: Wan2.1 T2V-1.3B
- Small enough to be a realistic first proof on constrained compute.
- Text-to-video is already wired into the worker contract.
- Keep the first end-to-end proof at 832x480 and 1–5 seconds.

### Quality candidate: LTX-2
LTX-2 is now a stronger open model family to evaluate for the quality tier. The official project supports text-to-video, image-to-video, video-to-video and synchronized audio/video. Its recommended two-stage pipeline can generate at target resolution and then upscale/refine.

Do not switch the proof worker blindly. LTX-2 is substantially larger, so it must first pass a real free-compute feasibility test on the available GPU before becoming the default.

## Routing rule

1. Prefer a genuinely free/open model that can actually execute on the currently available worker.
2. Prefer the highest-quality model that fits the worker's VRAM/time budget.
3. If a newer model materially improves quality while remaining £0, add it as a candidate and benchmark it.
4. Never introduce a paid provider merely to hide a missing free GPU.
5. Never claim a model is better until an objective or visual benchmark supports the switch.

## Benchmark gate

For each candidate, compare:
- prompt adherence;
- temporal consistency;
- motion quality;
- realism/detail;
- generation time;
- peak VRAM;
- output resolution/FPS;
- failure rate;
- free quota/availability.

The winner becomes the active quality route only after a real generated MP4 has passed the same QA pipeline as the existing worker.
