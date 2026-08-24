# Bikeztagram AI — Consolidation Audit

Date: 2026-08-24

## Canonical control point

The consolidation work is based on the protected `baseline/e2e-blob-gemini-working-2026-08-23` and the CI-verified Creative Engine development head `2811a1b47325450e3748e081d3b15c5ec421df11`.

`main` and Vercel production are intentionally untouched during this consolidation.

## Major finding

The development head contains substantially more work than the older build-status documents imply. The baseline-to-development comparison is 227 commits ahead with no divergence from the frozen baseline.

The development head includes Creative Engine Batches 77–83, multiple production/runtime contracts, many verification scripts, Creative Director command-center work, procedural video fallback work, and several music/production adapters.

## Duplicate / superseded candidates found

### AI Fill Planner

`src/aiFillPlannerV1.js` already exists in the canonical Creative Engine branch. The Complete Film candidate also supplied another implementation of the same filename with a different API (`planAiFill`, `createFillJobs`, `mergeGeneratedShots`). These must NOT be merged as two copies.

Decision: KEEP the canonical branch implementation as the current foundation. Adapt Complete Film verification/runtime integration to that API rather than introducing a duplicate file.

### AI edit planner

The repository contains multiple similarly named planners (`aiEditPlanner.js`, `aiEditPlanner2.js`, `aiEditPlannerFixed.js`) in the protected/current history. This is a confirmed consolidation target. No file is being deleted yet because imports/usage must be traced before removal.

### Music stack

The development head contains multiple generations/contracts including `musicProvider.js`, `musicProviderAdapterV2.js`, `musicProviderContractV2.js`, `musicProviderContractV3.js`, `musicProviderV3.js`, `musicGenerationRouterV2.js`, `musicGenerator.js`, `musicCompositionV3.js`, `musicDirectorV1.js` and `musicDirectorRuntimeV1.js`.

Decision: treat this as layered architecture until import/usage tracing proves which implementations are live. Do not delete by filename similarity alone.

### Cinematic / production stack

The development head contains parallel generations including `cinematicTimeline.js` + `cinematicTimelineV2.js`, multiple production/runtime bridges, render contracts, decision pipelines and quality engines.

Decision: preserve all currently referenced contracts; consolidate only after dependency tracing.

## Complete Film Runtime

The isolated Complete Film Runtime adds a genuinely new orchestration layer: understand → direct → parallel music/scenes → assemble → render → QA → optional revise → export.

A clean canonical candidate has been created that adds only the runtime and a verification workflow, while reusing the canonical AI Fill Planner instead of importing the duplicate implementation from the older candidate.

## Verification status

The development head has successful GitHub Actions runs for the Creative Engine development verification, Creative Engine Batches 78–80, and Music Batch 77. The latest development commit also contains the Batch 83 browser-only procedural fallback guard.

The clean Complete Film candidate now has its own CI workflow. It must pass build + runtime verification before any promotion.

## Promotion rules

1. Never rewrite the frozen Blob/Gemini/renderer baseline to accommodate experiments.
2. Never merge duplicate implementations simply because they exist on different candidate branches.
3. Prefer the implementation already present in the canonical development head when it provides the same contract.
4. Prefer a new candidate only when it adds a genuinely new capability or materially improves an existing contract and passes verification.
5. Keep Vercel as an acceptance environment, not the development loop.
6. `main` remains protected until the consolidated candidate has CI + browser/live-media acceptance.

## Next audit targets

- Trace imports for the duplicate AI edit planners.
- Trace imports for the music-provider generations and identify the live runtime path.
- Trace imports for cinematic timeline/production runtime generations.
- Check which verification scripts are active workflow inputs versus historical/one-off guards.
- Verify the Complete Film Runtime against the canonical Blob/Gemini/music/renderer adapters.
- Only then prepare a single promotion PR toward `main`.
