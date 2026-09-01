# Bikeztagram AI — parallel build route

This is the execution route, not a wishlist. Work is grouped so related changes land together and deployment is only done after a coherent batch is complete.

## Product target
One prompt + real photos/video -> AI-style creative direction -> best-shot selection -> story timeline -> original soundtrack -> optional original generated inserts -> browser render -> QA -> automatic bounded revision -> export.

## Runtime decision
Gemini is **not** part of the production runtime. The creative contracts are provider/model agnostic, and the current branch uses deterministic/local fallbacks so the app can function without a Gemini dependency.

## Parallel batches
1. **Foundation/runtime:** one production job contract, stage state, error handling, persistence.
2. **Understanding/director:** media scoring, subject identity, story roles, creative brief.
3. **Audio:** original procedural soundtrack, beat grid, mix, SFX/voiceover hooks, copyright gate.
4. **Editorial:** ranked source selection, non-repetitive sequencing, beat-aware cuts, transitions and generated-insert decisions.
5. **Render:** real media + timeline + audio must become one playable MP4; eliminate silent/black output paths.
6. **QA/revision:** technical checks and creative scoring; automatically revise weak plans up to three times.
7. **UX/export:** one clear Create flow, progress stages, preview, retry, save/restore and social export.
8. **Deployment:** build once, verify once, then deploy a meaningful batch to conserve Vercel limits.

## Session strategy
Do not wait for a `continue` between these batches. Inspect first, then make a coherent set of writes in one session, preferably as blobs/tree/one commit. Never spend deployments validating tiny edits. After each batch, verify the diff/build where tooling permits, then move immediately to the next unblocked batch.

## Current known good direction
`build/no-gemini-runtime-cleanup` is the working baseline. `build/parallel-production-batch-01` contains the first orchestration batch.

## Definition of done
A user can upload footage, describe the film naturally, press one creation action, and receive a non-black, non-silent, coherent cinematic video using their strongest footage, with an original soundtrack, persistent project state, QA feedback and export. Generated video is additive rather than a requirement for basic success.
