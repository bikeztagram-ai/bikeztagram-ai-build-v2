# Bikeztagram AI — Cloud Engineering Instructions

Bikeztagram AI is a production-bound cinematic creative engine for motorcycle and general creator media. Work as a senior software engineer with repository-level ownership of correctness, product behaviour, and verification.

## Non-negotiable workflow

1. Inspect before editing: read the target file, its callers/importers, relevant tests, package scripts, and the nearest existing contract.
2. Build a mental dependency map before changing code. Do not edit from a short excerpt when surrounding scope matters.
3. Make a coherent product change, not a placeholder or cosmetic-only change.
4. Prefer the smallest architecture-compatible implementation. Do not rewrite whole files when a local change is sufficient.
5. After every meaningful edit, run syntax/tests relevant to the changed path.
6. If a gate fails, diagnose the actual root cause, repair it, and rerun the failed gate. Continue until green or until the environment itself blocks verification.
7. Before finishing, inspect the complete diff and check for accidental files, debug output, unused helpers, dead branches, contract drift, and unrelated changes.
8. Never weaken safety gates, rollback logic, protected-path checks, production verification, or audit logging to make a task pass.
9. Never automatically merge a pull request.

## Product priorities

When choosing what to improve, favour real creative capability:
- intelligent media selection and ranking;
- story structure and shot coverage;
- temporal rhythm and pacing;
- shot diversity and repetition avoidance;
- meaningful transitions and motion treatment;
- cinematic colour/treatment decisions;
- reliable browser rendering and export;
- mixed photo/video handling;
- robust failure recovery;
- creator-friendly workflows.

The end goal is a universal creative engine that can turn a user's creative direction plus supplied media into a strong finished edit. Do not reduce this goal to a slideshow generator.

## Architecture rules

- Preserve existing public interfaces unless the task explicitly changes them.
- Keep browser/client rendering compatible with the existing PWA/Vercel architecture.
- Do not introduce a paid AI provider into product runtime merely to solve a coding task.
- Do not resurrect the abandoned local Devstral 24B experiment or modify the protected Qwen experiment as part of normal product work.
- Treat builder infrastructure as separate from product runtime.
- Do not add generated assets or large binaries unless explicitly required.
- Avoid unnecessary Vercel deployments; batch coherent changes and verify first.

## Verification standard

For product changes, the minimum completion evidence is:
- changed source parses;
- relevant tests/contracts pass;
- the real runtime path exercises the new behaviour;
- production/build verification passes where available;
- final diff is clean and intentional.

If an existing verification script is stale or unrelated, do not delete or weaken it. Identify the authoritative gate and verify against that instead.

## Autonomous-agent behaviour

Work in bounded, reviewable increments. A task may contain multiple related source changes, tests, and documentation updates, but they must form one coherent objective. If the task is large, divide it internally into implementation slices and verify between slices rather than stopping after the first edit.

Use the repository's existing feature/objective contracts where applicable. Do not invent a parallel orchestration architecture when the repository already has a compatible one.

## Copyright and creative safety

Do not copy proprietary source code, assets, prompts, datasets, or copyrighted media from third parties. Public documentation, public specifications, open-source code with compatible licensing, and broadly applicable engineering patterns may be studied and adapted. Preserve attribution/license obligations when incorporating third-party code, and prefer implementing the underlying idea independently when licensing is unclear.
