# Bikeztagram AI — Batch 1: Core Render Engine

This package contains the complete controlled Batch 1 file replacements prepared against the supplied project ZIP baseline.

## Changed files

- `src/renderer.js` — core browser renderer; adds captured source audio to the recorded stream and fixes the local-file fallback URL lifetime.
- `src/platformReframe.js` — deterministic multi-platform framing planner.
- `src/mediaSourceResolver.js` — single resolver for uploaded/generated timeline sources.
- `scripts/verify-core-render.mjs` — static/core verification suite.
- `scripts/verify-platform-reframe.mjs` — existing platform verification.
- `scripts/verify-media-source-resolver.mjs` — existing resolver verification.
- `package.json` — adds `npm run verify:core`.
- `.github/workflows/autonomous-control.yml` — DELETE this workflow. The autonomous control loop is intentionally disabled and must not be reintroduced.

## Verification completed on the supplied ZIP

- `npm run verify:core` — PASS
- `node scripts/verify-platform-reframe.mjs` — PASS
- `node scripts/verify-media-source-resolver.mjs` — PASS
- `node --check src/renderer.js` — PASS
- `node --check src/platformReframe.js` — PASS
- `node --check src/mediaSourceResolver.js` — PASS
- Local import existence audit — PASS

## Deliberately protected

No Blob upload configuration, Blob environment variable names, Gemini credentials, or existing API authentication values were changed.

No future trend-music, generative-video-provider, Project Brain, or Universal Director expansion is included in this batch.

## Final deployment gate

The only remaining verification that requires the real application environment is the production dependency install/build and an actual browser render against a real uploaded video. Those should be performed after this batch is applied to the live repository, before the Core Render milestone is declared 100% complete.