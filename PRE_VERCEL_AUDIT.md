# Bikeztagram AI — Pre-Vercel Audit Triage

Updated: 2026-08-21

## Purpose

Record the Gemini senior-engineer audit findings against the actual repository before any Vercel deployment. Do not change protected architecture merely because a concern is plausible; change it when repository evidence demonstrates a defect.

## Findings checked against the repository

### 1. Duplicate edit planners — NOT currently a demonstrated production defect

Gemini named `aiEditPlanner.js`, `aiEditPlanner2.js` and `aiEditPlannerFixed.js` as overlapping planners.

Repository evidence:
- `src/aiEditPlanner.js` is the active universal planner imported by `App.jsx`.
- `src/directorPlan.js` also imports the active `aiEditPlanner.js`.
- `src/aiEditPlanner2.js` was not found in the current development branch.
- `src/aiEditPlannerFixed.js` exists, but its exported `createDirectedEditPlan` is not the same implementation as the active `directorPlan.js` path.

Decision: **LEAVE ALONE FOR NOW.** The audit was partly based on stale/filename-level assumptions. Do not delete `aiEditPlannerFixed.js` until an import/dependency audit proves it is dead and no verification contract depends on it.

### 2. Client-side renderer / Android memory — PLAUSIBLE, REQUIRES LIVE TEST

The renderer deliberately runs in the browser at 1080×1920 and creates local object URLs when a media item only has a `File`. The application already revokes the final rendered/world URLs during reset and replacement.

Decision: **DO NOT RE-ARCHITECT BEFORE LIVE TESTING.** Run a real Android mixed-media render and measure whether memory pressure or tab termination actually occurs. If it fails, make a targeted renderer/resource-lifecycle fix rather than moving the renderer back to Vercel.

### 3. Android layout/touch targets — UNPROVEN

The UI is explicitly mobile-first, but source inspection cannot prove real touch behaviour.

Decision: **LIVE ACCEPTANCE REQUIRED; NO CODE CHANGE YET.**

### 4. Serverless timeout risk — PLAUSIBLE BUT NOT PROVEN

`api/analyse.js` can wait for Gemini video processing and retries, while `api/analyse-library.js` processes up to 12 sources sequentially. This is a genuine risk area, but the exact production limit depends on the Vercel environment and observed workload.

Decision: **TEST BEFORE RE-ARCHITECTING.** Do not add arbitrary timeout values or split the pipeline until a real deployment/test demonstrates the boundary.

### 5. Mixed aspect-ratio handling — PARTIALLY IMPLEMENTED

The renderer uses a cover-style fit into the protected 1080×1920 canvas, which avoids simple letterboxing. Alternate 1:1 and 16:9 formats are post-render export paths.

Decision: **LIVE VISUAL TEST REQUIRED.** Do not change the protected renderer until real mixed-aspect footage demonstrates bad crops or composition shifts.

### 6. Audio/video sync drift — UNPROVEN

Beat-aware timing and final audio attachment are separate systems, but the repository contains explicit audio/render QA contracts.

Decision: **LIVE TEST REQUIRED.** Do not modify the audio bridge without an observed sync defect.

### 7. Caption timing — PARTIALLY GUARDED

Single-video captions are attached using source-relative cue times, and mixed-media captions are matched against source-relative cut windows with confidence filtering.

Decision: **LIVE TEST REQUIRED.** Do not rewrite caption timing without an observed misalignment.

### 8. Object URL / media memory leaks — PARTIALLY MITIGATED

The application revokes generated result/world URLs when replacing/resetting them. The renderer also tracks whether it created a local source object URL so it can revoke it during its render lifecycle.

Decision: **KEEP UNDER LIVE AND LONG-SESSION TEST.** No speculative rewrite yet.

### 9. Secret exposure — CURRENTLY NO EVIDENCE OF CLIENT KEY LEAK

`GEMINI_API_KEY` usage is in `/api/*` server-side code. No `import.meta.env` usage was found in the repository search, and the client `App.jsx` calls server endpoints rather than constructing a Gemini client.

Decision: **NO CODE CHANGE REQUIRED NOW.** Preserve this boundary and keep the secret out of any ZIP shared externally.

### 10. Render failure / loading-state recovery — PARTIALLY GUARDED

The main render flow uses `try/catch/finally` and explicitly clears the rendering state. The render-quality loop also has bounded attempts.

Decision: **NO SPECULATIVE CHANGE.** Verify with forced renderer failure during local/preview testing.

## Pre-Vercel priority order

1. Real Android end-to-end render with mixed media.
2. Long-session/multi-file memory observation.
3. Mixed aspect-ratio visual inspection.
4. Audio sync and caption timing inspection.
5. Forced render-failure recovery test.
6. Verify the exact Vercel function/runtime boundary only if the live candidate exposes it.
7. Only then consider targeted fixes.

## Protected areas

Do not casually modify:
- Blob upload/authentication contract.
- Gemini server-side API-key boundary.
- Protected 1080×1920 renderer architecture.
- Core `/api/render`, `/api/analyse`, `/api/captions` contracts.
- GitHub verification workflow contracts.

## Release decision

The Gemini audit does **not** justify another architectural rewrite. It justifies a focused live-acceptance pass. No Vercel production deployment should occur until the above real-media checks have been completed and any demonstrated defects have been fixed.
