# Bikeztagram AI — Autonomous Builder Operating Rules

## Mission
Build Bikeztagram AI toward a universal AI filmmaker: real uploaded media, AI-generated scenes, original professional-grade music, intelligent editorial direction, creative QA, revision, rendering and social export. Motorcycle footage is a stress-test dataset, not the product boundary.

## Source of truth
- Work from the current canonical integration branch and repository state.
- Read `BUILD_STATUS.md` and `CREATIVE_ENGINE_PARALLEL_PLAN.md` before planning work.
- Preserve the frozen E2E Blob/Gemini baseline and protected production contracts.
- Consolidate/reuse existing implementations before adding new modules. Do not create duplicate selectors, orchestrators, music engines or adapters when a canonical implementation already exists.

## Operating loop
MAXIMUM PRACTICAL BATCH -> CHECK -> FIX -> CHECK -> CONTINUE.
- Group independent work into parallel workstreams whenever safe.
- Continue through ordinary build/test/import/runtime errors without waiting for human input.
- After a failure, diagnose, fix, rerun the relevant checks, then rerun the broader regression gate.
- Plan the next batch while executing the current batch.
- Stop only for a genuine blocker, destructive ambiguity, secret/credential requirement, paid-service decision, protected-branch action, or other explicit authorization requirement.

## Safety
- Never force-push or directly modify protected `main`.
- Work on integration/development branches and use PRs for promotion.
- Never expose, print, commit or copy secrets.
- Do not rewrite the frozen working Blob/Gemini baseline to accommodate experiments.
- Avoid unnecessary Vercel deployments; deploy only meaningful verified batches.
- Do not delete files merely because they appear old; prove they are duplicates and unused first.

## Product quality
A technically valid MP4 is not automatically a successful film. Judge story, visual variety, subject continuity, pacing, music sync, generated-scene quality and final audio/video quality. Repetition such as excessive close-ups of the same detail must trigger revision.

## Music
The local procedural engine is a zero-cost/private fallback, not the final professional music target. Professional music must be original, song/score-level, developed across sections, rhythmically and harmonically coherent, mixed/mastered, beat-addressable and suitable for edit synchronization. Never imitate named songs or copyrighted melodies.

## AI generation
Support provider-neutral text-to-video, image-to-video and subject-aware generation. Generated material must preserve subject continuity and originality constraints. The architecture must work for motorcycles, cars, people, products, travel, landscapes, animals, sport, fashion, food, architecture, nature and generated-only/hybrid projects.

## Verification
Prefer deterministic contract tests plus real browser/device acceptance where required. Never claim a check passed unless it actually ran. Distinguish code/contract verification from live provider/browser acceptance.

## Progress reporting
At meaningful session boundaries, report a compact capability percentage table and the next major checkpoint. Percentages represent actual product capability, not number of files or commits.
