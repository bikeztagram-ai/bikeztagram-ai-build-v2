# AutoBot Fleet Foundation — V1

## Purpose

This is the first protected step toward a multi-agent Bikeztagram development system. It does **not** replace or modify the proven Builder Bot and it does **not** activate autonomous multi-bot execution yet.

The long-term system is:

`Bikeztagram North Star -> Coordinator -> specialist worker -> verification -> handoff -> next worker -> repair/self-improvement when required -> repeat`

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

The Reviewer does not edit the candidate. It independently inspects a specific base/candidate commit pair, reconstructs that candidate in a disposable worktree, checks the actual diff and runs the build. It challenges product-quality failure modes that are particularly relevant to Bikeztagram, including fixed story templates, evidence-free selection and duration-blind planning.

Its verifier is:

`scripts/autobot/verify-autobot-reviewer.mjs`

and the main verification suite exposes it as:

`verify:autobot-reviewer`

The Reviewer produces an auditable `pass`, `needs-repair` or `reject` disposition and never merges or pushes. It remains an isolated specialist until the fleet coordinator is separately activated.

## Self-Improvement Bot

The fourth specialist worker is implemented at the exact registered path:

`builder/runner/autobot-self-improvement.mjs`

It is deliberately **analysis-only** in V1. It consumes the durable failure queue, live AutoBot telemetry, resumable Builder state when present, and available Reviewer evidence. It groups recurring failure signatures, classifies likely failure layers (brain, contract, verification, runner or task), ranks evidence-backed proposals and writes them to:

`builder/working/autobot-self-improvement.json`

The output schema is `autobot-self-improvement-v1`. Every proposal records evidence, confidence, expected impact and `requiresHumanReview: true`. The worker records `appliedChanges: []` and has no repository-write, merge or push capability. Protected Builder/workflow/objective-registry paths are explicitly declared and cannot be changed by this worker.

Its verifier is:

`scripts/autobot/verify-autobot-self-improvement.mjs`

and the main verification suite exposes it as:

`verify:autobot-self-improvement`

This is the first safe self-improvement stage: it learns from failures without being allowed to rewrite the system that judges it.

## Coordinator

The V1 coordinator is:

`builder/runner/autobot-coordinator.mjs`

It is deliberately **plan-only**. It reads:

- `builder/brain/autobot-fleet.json`
- `builder/working/autobot-failure-queue.jsonl`
- `builder/working/aider-feature-brain-state.json`

and writes:

`builder/working/autobot-fleet-plan.json`

It may identify that a repair is required, that a repaired handoff requires QA, that the proven builder has resumable work, or that the builder is ready. It must not launch another worker in this foundation stage.

## Fleet Registry

The authoritative registry is:

`builder/brain/autobot-fleet.json`

Every bot must have an exact id, role, entrypoint and lifecycle status. Planned workers use `future:` entrypoints until their implementation actually exists.

The registry currently describes:

- `builder` — proven protected product builder
- `repair` — verified isolated failure-analysis and repair worker
- `qa` — verified independent product verifier
- `reviewer` — verified adversarial product reviewer
- `self-improvement` — verified analysis-only AutoBot-system improvement worker

### Discoverability contract

Whenever a bot, entrypoint, path, protocol, handoff field or workflow integration is added, renamed or removed, update **all** dependent references in the same integration change. The authoritative registry, coordinator, validators, task/brain wording, workflow wiring, state/resume metadata and documentation must agree before activation.

A removed or renamed item must not remain discoverable through stale active wording.

## Safe activation path

Activation is intentionally staged:

1. Prove the registry and queue primitives, including durable failure transitions.
2. Prove isolated repair-worker execution without touching the protected builder.
3. Prove independent QA/handoff contracts.
4. Prove adversarial Reviewer execution and review evidence.
5. Prove analysis-only Self-Improvement and its evidence contract.
6. Add coordinator scheduling only after worker contracts are verified.
7. Add controlled parallel workers with conflict isolation.
8. Allow measured self-improvement proposals to feed a human-reviewed improvement lane.
9. Only then consider continuous autonomous orchestration.

No stage may weaken existing production gates, safety rules, rollback, audit or protected workflow controls merely to make the fleet appear successful.
