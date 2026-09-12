# AutoBot Fleet Foundation — V1

## Purpose

This is the first protected step toward a multi-agent Bikeztagram development system. It does **not** replace or modify the proven Builder Bot and it does **not** activate autonomous multi-bot execution yet.

The long-term system is:

`Bikeztagram North Star -> Coordinator -> specialist worker -> verification -> adversarial review -> handoff -> next worker -> repair/self-improvement when required -> repeat`

## Protected Builder

The existing proven feature worker remains:

`builder/runner/aider-feature-brain.mjs`

It remains the production builder until a future migration proves that another worker can safely replace or complement it. The fleet foundation must never silently alter its scope, rollback, verification, or production gates.

## Failure Queue

Unresolved worker failures are intended to become structured handoff evidence rather than disappearing at the end of a run.

The V1 primitive is:

`builder/runner/autobot-failure-queue.mjs`

The default evidence path is:

`builder/working/autobot-failure-queue.jsonl`

A failure record contains a stable schema version, source/run/objective/task identifiers, stage, error, expected/actual information when available, affected files, attempted actions, evidence references, retryability and a repair hint when one exists.

The queue is append-only. A repair or QA worker must never rewrite historical failure evidence. State transitions are represented by a new record with the same failure id.

The supported lifecycle is:

`open -> claimed -> repairing -> repaired -> verified`

with terminal/blocked outcomes:

`rejected` or `blocked`.

Illegal backwards or skipped transitions are rejected by the queue contract. This prevents a worker from falsely marking a failure verified without going through the repair and verification handoff stages.

The `repaired` handoff also records the exact `repairBaseCommit` and `repairCommit`, allowing independent QA to reconstruct the repair without trusting the Repair Bot's working tree.

## Repair Bot

The first specialist worker is implemented at the exact registered path:

`builder/runner/autobot-repair.mjs`

Its contract is intentionally isolated:

1. Claim one `open` failure from the durable queue.
2. Validate the failure's declared file scope and reject unsafe/protected paths.
3. Create a disposable git worktree and `autobot-repair/<failure-id>` branch from the protected checkout's current `HEAD`.
4. Ask Aider to diagnose and repair only the declared failure files.
5. Check the isolated diff and reject any out-of-scope modification.
6. Run `npm run build` and `npm run verify:autobot-product-change-quality` in the isolated worktree.
7. Commit only after those checks pass and record `repaired` evidence containing the repair branch, base commit and repair commit.
8. Remove the temporary worktree while preserving the repair branch for independent QA.
9. On failure, record `blocked`; it never edits the protected Builder checkout.

The Repair Bot never merges or pushes automatically. It cannot modify the protected Builder runner, feature-objective registry, production workflow, package/dependency manifests or environment files through its declared repair scope.

Its verifier is:

`scripts/autobot/verify-autobot-repair-bot.mjs`

and the main verification suite exposes it as:

`verify:autobot-repair-bot`

The registry marks `repair` as `verified`, while the fleet itself remains disabled and plan-only. This means the worker is ready for controlled isolated use but cannot be launched by the existing production workflow or the foundation coordinator.

## Independent QA Bot

The second specialist worker is implemented at the exact registered path:

`builder/runner/autobot-qa.mjs`

QA is deliberately independent of the Repair Bot's working tree. It consumes only `repaired` queue handoffs and requires the recorded repair branch, `repairBaseCommit` and `repairCommit`.

Its contract is:

1. Locate one `repaired` handoff.
2. Verify the repair branch points to the recorded commit and that the recorded base is its direct parent.
3. Inspect the committed diff and enforce the original failure file scope.
4. Reconstruct the repair patch from the recorded base into a fresh detached worktree.
5. Run `git diff --check`, `npm run build` and `npm run verify:autobot-product-change-quality` independently.
6. Record `verified` only after every independent check passes.
7. Record `rejected` when the repair does not survive independent verification.
8. Remove the QA worktree without modifying the protected checkout.

QA never merges or pushes automatically. It is the verification authority for the `repaired -> verified` handoff, while the fleet remains disabled and plan-only.

Its verifier is:

`scripts/autobot/verify-autobot-qa.mjs`

and the main verification suite exposes it as:

`verify:autobot-qa`

## Adversarial Reviewer Bot

The third specialist worker is implemented at the exact registered path:

`builder/runner/autobot-reviewer.mjs`

The Reviewer is deliberately independent of the Builder and Repair Bot. Its job is not to make a candidate pass; its job is to try to prove that a candidate is **not** good enough.

Its contract is:

1. Review an explicit `AUTOBOT_REVIEW_BASE_COMMIT` against `AUTOBOT_REVIEW_COMMIT`.
2. Inspect the complete candidate diff and changed-file scope.
3. Reject changes to protected Builder/workflow/objective infrastructure.
4. Independently run the project build.
5. Challenge cinematic product changes for fixed story templates, evidence-free selection and duration-blind planning.
6. Produce an auditable disposition: `pass`, `needs-repair` or `reject`.
7. Write structured evidence to `builder/working/autobot-review.json` unless another explicit output path is supplied.
8. Never merge or push.

Its verifier is:

`scripts/autobot/verify-autobot-reviewer.mjs`

and the main verification suite exposes it as:

`verify:autobot-reviewer`

The registry marks `reviewer` as `verified`, while the fleet remains disabled and plan-only. The Reviewer is therefore ready for controlled use but is not silently activated by the existing production workflow.

## Coordinator

The V1 coordinator is:

`builder/runner/autobot-coordinator.mjs`

It is deliberately **plan-only**. It reads:

- `builder/brain/autobot-fleet.json`
- `builder/working/autobot-failure-queue.jsonl`
- `builder/working/aider-feature-brain-state.json`

and writes:

`builder/working/autobot-fleet-plan.json`

It may identify that a repair is required, that a repaired handoff needs QA, that the proven builder has resumable work, or that the builder is ready. It must not launch another worker in this foundation stage.

## Fleet Registry

The authoritative registry is:

`builder/brain/autobot-fleet.json`

Every bot must have an exact id, role, entrypoint and lifecycle status. Planned workers use `future:` entrypoints until their implementation actually exists.

The registry currently describes:

- `builder` — proven protected product builder
- `repair` — verified isolated failure-analysis and repair worker
- `qa` — verified independent product verifier
- `reviewer` — verified adversarial product reviewer
- `self-improvement` — planned AutoBot-system improvement worker

### Discoverability contract

Whenever a bot, entrypoint, path, protocol, handoff field or workflow integration is added, renamed or removed, update **all** dependent references in the same integration change. The authoritative registry, coordinator, validators, task/brain wording, workflow wiring, state/resume metadata and documentation must agree before activation.

A removed or renamed item must not remain discoverable through stale active wording.

## Safe activation path

Activation is intentionally staged:

1. Prove the registry and queue primitives, including durable failure transitions.
2. Prove isolated repair-worker execution without touching the protected builder.
3. Prove independent QA/handoff contracts.
4. Prove adversarial Reviewer contracts and candidate-quality dispositions.
5. Add coordinator scheduling only after worker contracts are verified.
6. Add controlled parallel workers with conflict isolation.
7. Add measured self-improvement for recurring failures.
8. Only then consider continuous autonomous orchestration.

No stage may weaken existing production gates, safety rules, rollback, audit or protected workflow controls merely to make the fleet appear successful.
