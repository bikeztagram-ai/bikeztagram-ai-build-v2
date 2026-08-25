# Autonomous Builder Batch Queue

This is the durable roadmap consumed by the Autonomous Builder workflow. The user should only need to press **Run workflow**. The workflow owns batch selection, numbering and isolated branch naming.

## Status rules

- `READY` — next available product batch.
- `IN_PROGRESS` — already claimed by a running/completed builder PR; never dispatch it twice.
- `DONE` — completed and merged; retained as history.
- The workflow may claim/release queue state, but product batches must never edit this queue or workflow infrastructure.
- A successful builder run leaves its batch `IN_PROGRESS` until the resulting PR is reviewed/merged.
- A failed builder run releases its batch back to `READY` so it can be retried.

## Quality rules

- Inspect existing code/contracts first and improve working systems in place.
- Use check → fix → check → continue.
- Production code must improve; tests alone are not a completed product batch.
- Preserve the end-game specification as the quality bar.
- Product batches must not modify `.github/workflows/**` or autonomous-runner infrastructure.
- No automatic merge to `main`, production deployment, or paid infrastructure provisioning.

## Queue

- DONE Batch 82 — Director/media profiling and foundational end-game preparation.
- DONE Batch 83 — Precision director: prompt interpretation, media ranking, diversity, story beats, pacing, transitions, motion, continuity and music-aware cues.
- READY Batch 84 — Professional music: prompt-driven musical identity, memorable hooks, structure, builds/drops, BPM/beat/section metadata, actual-audio analysis, synchronisation and strong original fallback.
- READY Batch 85 — Director + music integration: make soundtrack structure actively drive cinematic timing, reveals, action peaks, transitions and endings without breaking existing renderer contracts.
- READY Batch 86 — Cinematic generated-scene foundation: photo/prompt-to-original-scene contracts, identity/continuity/camera/world consistency and copyright-safe game-inspired direction.
- READY Batch 87 — Rendering/editor quality: stronger motion, reframing, speed ramps, transitions, colour treatment, text and social export while preserving existing renderer behaviour.
- READY Batch 88 — End-to-end creative pipeline: natural-language brief → media analysis → director → original music → beat-aware edit → render → final validation.
- READY Batch 89 — Product hardening and quality gate: behavioural regression suite, failure recovery, determinism where required, performance and end-game acceptance checks.

The workflow derives the isolated branch as `autonomous-builder/batch-N` and passes the exact queued objective to the bounded runner.
