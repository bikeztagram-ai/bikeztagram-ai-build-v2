# Autonomous Builder Batch Queue

The Autonomous Builder must select the next product batch from this queue. The user should not have to invent batch numbers, branch names or objectives.

## Rules

- Select the first unchecked batch.
- Derive the isolated branch as `autonomous-builder/batch-N`.
- Use the objective written below verbatim as the builder objective.
- A completed batch is checked only after its implementation and verification have passed and its work has been reviewed/merged.
- Product batches inspect existing code/contracts first, improve working systems in place, and use check → fix → check → continue.
- Do not modify `.github/workflows/**` or autonomous-runner infrastructure from product batches.
- Do not automatically merge to `main` or deploy production.

## Queue

- [x] Batch 82 — Director/media profiling and foundational end-game preparation.
- [ ] Batch 83 — Precision director: prompt interpretation, media ranking, diversity, story beats, pacing, transitions, motion, continuity and music-aware cues.
- [ ] Batch 84 — Professional music: prompt-driven musical identity, memorable hooks, structure, builds/drops, BPM/beat/section metadata, actual-audio analysis, synchronisation and strong original fallback.
- [ ] Batch 85 — Director + music integration: soundtrack structure drives cinematic timing, reveals, action peaks, transitions and endings.
- [ ] Batch 86 — Cinematic generated-scene foundation: photo/prompt-to-original-scene contracts, identity/continuity/camera/world consistency and copyright-safe game-inspired direction.
- [ ] Batch 87 — Rendering/editor quality: stronger motion, reframing, speed ramps, transitions, colour treatment, text and social export.
- [ ] Batch 88 — End-to-end creative pipeline: natural-language brief → media analysis → director → original music → beat-aware edit → render → final validation.
- [ ] Batch 89 — Product hardening and end-game quality gate: behavioural regression, failure recovery, performance and acceptance checks.
