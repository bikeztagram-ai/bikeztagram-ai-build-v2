# Bikeztagram AI — Autonomous Coding Agent Contract

This repository is developed with autonomous coding agents. Treat every task as a real engineering task, not a documentation exercise.

## Primary objective
Make the smallest safe, meaningful product improvement that advances Bikeztagram AI toward its production goal. A successful task must change product/source behaviour unless the task explicitly asks for tooling-only work.

## Required operating loop

1. **Inspect first.** Read the relevant source files, callers, tests, package scripts, and existing contracts before editing. Do not infer a function's scope from a short snippet.
2. **Plan narrowly.** Identify the exact product behaviour being improved and the minimum files required.
3. **Edit safely.** Preserve surrounding code and existing contracts. Prefer small, local edits over whole-file rewrites.
4. **Verify immediately.** Run syntax checks and the most relevant existing verification scripts after each meaningful edit.
5. **Repair closed-loop.** If any check fails, inspect the failure, fix the root cause, and rerun the failed gate plus related gates. Do not stop merely because a diff exists.
6. **Verify production behaviour.** Run the repository's strongest available build/release/production gate before declaring success.
7. **Review the diff.** Confirm the final diff is intentional, relevant, and free of generated junk or unrelated refactors.
8. **Submit, never merge.** Create/update a pull request with a concise summary and verification evidence. Never merge automatically.

## Product-source requirement
A green run is not sufficient if it only modifies tests, scripts, prompts, CI, or documentation. For normal feature work, the final diff must contain a genuine change to the product source path that implements the requested behaviour and is exercised by the relevant runtime path.

## Repository safety

- Do not weaken scope guards, rollback behaviour, production gates, or safety checks just to make a run green.
- Do not remove failing tests or verification scripts to hide failures.
- Do not replace existing architecture wholesale when a local correction is sufficient.
- Do not introduce model-specific dependencies into the product runtime unless the task explicitly requires them.
- The abandoned local Devstral 24B experiment and the protected Qwen branch are isolated experiments. Do not resurrect or merge either as part of unrelated product work.
- Avoid unnecessary Vercel deployments. Batch related changes and verify locally/through CI before triggering deployment work.

## Bikeztagram quality expectations

The application is a universal cinematic creative engine. Changes should favour real creative quality: intelligent media selection, story structure, temporal rhythm, shot diversity, meaningful transitions, cinematic treatment, reliable rendering, and robust handling of mixed user media. Avoid superficial UI-only changes when the task is about creative capability.

## Failure policy

A failure is information, not a reason to stop. Preserve the failure evidence, diagnose the actual contract that broke, make the smallest repair, and rerun verification. If the environment itself blocks a check, state exactly which check was blocked and do not claim it passed.

## Completion standard

Do not report "complete" until:
- the intended product behaviour is implemented;
- relevant syntax/tests/contracts pass;
- production/build verification passes where available;
- the final diff has been inspected;
- the PR is ready for human review;
- nothing has been merged automatically.
