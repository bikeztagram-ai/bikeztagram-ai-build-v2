# batch-85

## Objective
Integrate the existing cinematic director and original music systems toward the finished end-game architecture. Inspect the current director, musicGenerator, audioBeatAnalyzer, renderer and edit-plan contracts before changing anything. Make soundtrack structure, BPM, beat grid, sections, energy and musical events materially influence shot duration, cut timing, transitions, reveals, action peaks, hero moments and endings while preserving sensible results when music metadata is sparse. Keep prompt-specific creative intent in control so music supports the requested story rather than imposing a generic template. Improve beat-aware timing, section alignment, continuity, pacing and audiovisual payoff in production code. Add behavioural verification proving that different musical structures and creative briefs can produce materially different timing plans, that cuts align sensibly to beat/section boundaries, and that existing render/build/Blob/music contracts remain valid. Use check-fix-check-continue. Do not merely add tests. Preserve the future generated-scene architecture and copyright-safe original-content requirement. Do not modify .github/workflows/** or autonomous-runner infrastructure; do not automatically merge, deploy production or provision paid infrastructure.

## Status
Completed.

## Summary of Work
- Researched existing director, music generator, and beat analyzer contracts.
- Implemented `snapTimeToSection` in `src/musicDirector.js` to allow alignment of editorial cuts to musical section boundaries.
- Updated `alignCutsToMusic` in `src/musicDirector.js` to incorporate `snapTimeToSection` for more robust, structure-aware timing.
- Updated `scripts/verify-batch21-music-director.mjs` to correctly expect `beat-aware-v2`.
- Created `scripts/verify-batch85-section-alignment.mjs` as behavioural verification for the new section-aware alignment.
- Verified changes with existing and new tests.

## Working rule
Execute the supplied objective; do not invent roadmap work.
