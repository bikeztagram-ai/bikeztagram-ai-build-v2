# Autonomous Builder Batch Queue

This file is the product-level queue used by the Autonomous Builder workflow. The workflow should select the next unchecked batch automatically; the user should not have to invent batch numbers, branch names or objectives.

## Operating rules

- The workflow owns batch numbering from this queue.
- Each completed batch must leave a durable record of what it changed and what remains next.
- Product batches must inspect existing code/contracts first, improve working systems in place, and use check → fix → check → continue.
- Do not modify `.github/workflows/**` or autonomous-runner infrastructure from product batches.
- Do not automatically merge to `main` or deploy production.
- Keep the finished end-game specification as the quality bar.

## Queue

- [x] Batch 82 — Director/media profiling and foundational end-game preparation.
- [ ] Batch 83 — Precision director: prompt interpretation, media ranking, diversity, story beats, pacing, transitions, motion, continuity and music-aware cues.
- [ ] Batch 84 — Professional music: prompt-driven musical identity, memorable hooks, structure, builds/drops, BPM/beat/section metadata, actual-audio analysis, synchronisation and strong original fallback.
- [ ] Batch 85 — Director + music integration: make soundtrack structure actively drive cinematic timing, reveals, action peaks, transitions and endings without breaking existing renderer contracts.
- [ ] Batch 86 — Cinematic generated-scene foundation: photo/prompt-to-original-scene contracts, identity/continuity/camera/world consistency and copyright-safe game-inspired direction.
- [ ] Batch 87 — Rendering/editor quality: stronger motion, reframing, speed ramps, transitions, colour treatment, text and social export while preserving existing renderer behaviour.
- [ ] Batch 88 — End-to-end creative pipeline: natural-language brief → media analysis → director → original music → beat-aware edit → render → final validation.
- [ ] Batch 89 — Product hardening and quality gate: behavioural regression suite, failure recovery, determinism where required, performance and end-game acceptance checks.

The workflow should use the unchecked queue item as the next batch and derive the isolated branch as `autonomous-builder/batch-N`.
