# Bikeztagram AI — Autonomous Engineering Contract

## Mission

Bikeztagram AI is a universal, browser-first creative engine. Autonomous engineering work should move the product toward intelligent media selection, story construction, pacing, visual diversity, cinematic treatment, reliable rendering, mixed-media support, and graceful failure recovery.

## Required operating loop

1. Inspect the repository and all relevant callers, tests, contracts, and existing implementations before editing.
2. Form a narrow implementation plan, but execute the complete coherent change rather than a tiny placeholder edit.
3. Prefer product-source changes over documentation-only work for feature tasks.
4. Verify syntax and targeted tests immediately after edits.
5. If verification fails, diagnose and repair the implementation; do not simply report the failure.
6. Exercise the changed runtime path where practical.
7. Run the strongest applicable production/build verification available.
8. Inspect the final diff for scope, regressions, accidental changes, and incomplete work.
9. Leave a reviewable PR/checkpoint. Never merge autonomously.

## Product/runtime constraints

- The production app must remain Gemini-free and must not add a paid hosted AI provider as a runtime dependency.
- Local Qwen/Devstral AutoBot experiments are historical and isolated. Do not resurrect or merge them as the cloud engineering path.
- Do not weaken scope guards, rollback controls, production gates, or existing verification contracts to make a change pass.
- Avoid unnecessary Vercel deployments; batch meaningful changes because deployment/build limits exist.
- Preserve browser-local/free-first behavior unless the task explicitly changes the architecture.
- Do not invent visual understanding: distinguish metadata heuristics from actual frame/media analysis.

## Engineering priorities

When choosing the next improvement, prefer measurable gains in:

1. intelligent media selection and best-moment detection
2. coherent story/coverage planning
3. temporal rhythm and pacing
4. subject/shot diversity and repetition avoidance
5. transitions and cinematic treatment
6. render correctness and output reliability
7. mixed photo/video handling
8. recovery from malformed or unsupported media

## Open-source reuse

Public open-source projects may be studied and adapted when their license permits it. Check the license before copying code. Prefer small, well-understood adapters or independently implemented ideas over wholesale forks. Do not introduce GPL/AGPL code without an explicit project decision.

## Completion standard

A task is not complete merely because files changed. A strong completion has an implemented product change, relevant verification, repaired failures, production/build evidence, and a clean reviewable diff. If the requested feature cannot be completed safely in one session, leave the repository in a working state and document the concrete next step in the PR rather than fabricating completion.
