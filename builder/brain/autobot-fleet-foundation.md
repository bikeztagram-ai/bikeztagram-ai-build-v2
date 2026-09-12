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

## Repair Bot

The first specialist worker is now implemented at the exact registered path:

`builder/runner/autobot-repair.mjs`

Its contract is intentionally isolated:

1. Claim one `open` failure from the durable queue.
2. Validate the failure's declared file scope and reject unsafe/protected paths.
3. Create a disposable git worktree and `autobot-repair/<failure-id>` branch from the protected checkout's current `HEAD`.
4. Ask Aider to diagnose and repair only the declared failure files.
5. Check the isolated diff and reject any out-of-scope modification.
6. Run `npm run build` and `npm run verify:autobot-product-change-quality` in the isolated worktree.
7. Commit only after those checks pass and record `repaired` evidence containing the repair branch and commit.
8. Remove the temporary worktree while preserving the repair branch for independent QA.
9. On failure, record `blocked`; it never edits the protected Builder checkout.

The Repair Bot never merges or pushes automatically. It cannot modify the protected Builder runner, feature-objective registry, production workflow, package/dependency manifests or environment files through its declared repair scope.

Its verifier is:

`scripts/autobot/verify-autobot-repair-bot.mjs`

and the main verification suite exposes it as:

`verify:autobot-repair-bot`

The registry marks `repair` as `verified`, while the fleet itself remains disabled and plan-only. This means the worker is ready for controlled isolated use but cannot be launched by the existing production workflow or the foundation coordinator.

## Coordinator

The V1 coordinator is:

`builder/runner/autobot-coordinator.mjs`

It is deliberately **plan-only**. It reads:

- `builder/brain/autobot-fleet.json`
- `builder/working/autobot-failure-queue.jsonl`
- `builder/working/aider-feature-brain-state.json`

and writes:

`builder/working/autobot-fleet-plan.json`

It may identify that a repair is required, that the proven builder has resumable work, or that the builder is ready. It must not launch another worker in this foundation stage.

## Fleet Registry

The authoritative registry is:

`builder/brain/autobot-fleet.json`

Every bot must have an exact id, role, entrypoint and lifecycle status. Planned workers use `future:` entrypoints until their implementation actually exists.

The registry currently describes:

- `builder` — proven protected product builder
- `repair` — verified isolated failure-analysis and repair worker
- `qa` — planned independent product verifier
- `reviewer` — planned adversarial product reviewer
- `self-improvement` — planned AutoBot-system improvement worker

### Discoverability contract

Whenever a bot, entrypoint, path, protocol, handoff field or workflow integration is added, renamed or removed, update **all** dependent references in the same integration change. The authoritative registry, coordinator, validators, task/brain wording, workflow wiring, state/resume metadata and documentation must agree before activation.

A removed or renamed item must not remain discoverable through stale active wording.

## Safe activation path

Activation is intentionally staged:

1. Prove the registry and queue primitives, including durable failure transitions.
2. Prove isolated repair-worker execution without touching the protected builder.
3. Add independent QA/handoff contracts.
4. Add coordinator scheduling only after worker contracts are verified.
5. Add controlled parallel workers with conflict isolation.
6. Add measured self-improvement for recurring failures.
7. Only then consider continuous autonomous orchestration.

No stage may weaken existing production gates, safety rules, rollback, audit or protected workflow controls merely to make the fleet appear successful.
