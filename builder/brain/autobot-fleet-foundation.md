# AutoBot Fleet Foundation — V1

## Purpose

This is the first protected step toward a multi-agent Bikeztagram development system. It does **not** replace or modify the proven Builder Bot and it does **not** activate autonomous multi-bot execution yet.

The long-term system is:

`Bikeztagram North Star -> Coordinator -> specialist Builder -> Reviewer -> Repair/QA when required -> Self-Improvement -> next specialist Builder -> repeat`

## Protected Builder

The existing proven feature worker remains:

`builder/runner/aider-feature-brain.mjs`

It remains the production builder until a future migration proves that another worker can safely replace or complement it. The fleet foundation must never silently alter its scope, rollback, verification, or production gates.

## Specialist Builder Fleet

The fleet now has a shared isolated Builder runner:

`builder/runner/autobot-specialist-builder.mjs`

The runner is deliberately blocked unless **both** the fleet registry is `enabled: true` with `coordination.mode: active` and `AUTOBOT_SPECIALIST_BUILDER_ENABLED=true`. This keeps the current foundation plan-only while making the specialist execution contract concrete and testable.

Every specialist Builder receives:

- `AUTOBOT_SPECIALIST_BOT_ID` — exact registry bot id
- `AUTOBOT_SPECIALIST_OBJECTIVE` — explicit task objective
- `AUTOBOT_SPECIALIST_BUILDER_ENABLED` — explicit execution gate

The runner resolves the bot from the authoritative registry and uses its exact `ownsFiles` scope. It refuses unknown/unverified/protected bots, unsafe paths and out-of-scope modifications. Each run starts from the protected checkout `HEAD`, creates a disposable `autobot-specialist/<bot-id>-<timestamp>` worktree/branch, runs Aider without auto-commit, checks the isolated diff, runs `git diff --check` and `npm run build`, then creates a candidate commit only after verification. It removes the disposable worktree and never merges or pushes.

### Director Builder

Registry id:

`director-builder`

Role:

`specialist-cinematic-director-builder`

Owns:

- creative direction
- story construction
- shot selection
- director runtime

Exact product scope:

`src/director.js`
`src/directorPlan.js`
`src/directorSelection.js`
`src/directorRhythm.js`
`src/directorRenderRuntime.js`
`src/aiEditPlanner.js`

### Timeline Builder

Registry id:

`timeline-builder`

Role:

`specialist-executable-timeline-builder`

Owns:

- timeline execution
- editorial rhythm
- cut timing
- transition and motion execution

Exact product scope:

`src/executableTimeline.js`
`src/timelineDirector.js`
`src/editorialRhythm.js`
`src/beatAwareTimeline.js`
`src/renderTiming.js`

These are complementary specialist Builders rather than competing copies of the protected Builder. Their scopes are intentionally narrow enough to permit future isolated parallelism without allowing two workers to silently edit the same product surface.

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

Illegal backwards or skipped transitions are rejected by the queue contract.

The `repaired` handoff records exact `repairBaseCommit` and `repairCommit`, allowing independent QA to reconstruct the repair without trusting the Repair Bot's working tree.

## Repair Bot

The Repair Bot is implemented at:

`builder/runner/autobot-repair.mjs`

It claims one open failure, validates file scope, creates an isolated worktree, repairs only declared failure files, checks the isolated diff, runs build and product-quality verification, commits only after checks pass, records the repair base/candidate commits and preserves the repair branch for independent QA. It never merges or pushes and cannot modify protected infrastructure through its declared scope.

Verifier:

`scripts/autobot/verify-autobot-repair-bot.mjs`

Package command:

`verify:autobot-repair-bot`

## Independent QA Bot

The QA worker is implemented at:

`builder/runner/autobot-qa.mjs`

It consumes only `repaired` handoffs, verifies the repair branch and recorded commit ancestry, reconstructs the patch in a fresh detached worktree, checks diff scope, runs `git diff --check`, build and product-quality verification, then records `verified` or `rejected`. It never merges or pushes.

Verifier:

`scripts/autobot/verify-autobot-qa.mjs`

Package command:

`verify:autobot-qa`

## Adversarial Reviewer Bot

The Reviewer is implemented at:

`builder/runner/autobot-reviewer.mjs`

It does not edit the candidate. It independently inspects an explicit base/candidate commit pair in a disposable worktree, checks the real diff and build, and challenges known Bikeztagram product-quality failure modes such as fixed story templates, evidence-free selection and duration-blind planning.

The explicit Coordinator -> Reviewer handoff contract is:

- `AUTOBOT_REVIEW_BASE_COMMIT`
- `AUTOBOT_REVIEW_COMMIT`

Both must be full 40-character hexadecimal commit SHAs. The Coordinator must not infer reviewer state from undocumented Builder state such as `state.lastRunCommit`. The plan persists the validated pair as `reviewCandidate.baseCommit` and `reviewCandidate.candidateCommit`.

Verifier:

`scripts/autobot/verify-autobot-reviewer.mjs`

Handoff verifier:

`scripts/autobot/verify-autobot-reviewer-handoff.mjs`

Package commands:

`verify:autobot-reviewer`
`verify:autobot-reviewer-handoff`

The Reviewer produces an auditable `pass`, `needs-repair` or `reject` disposition and never merges or pushes. A `needs-repair` disposition enters the authoritative failure queue for isolated Repair Bot handling.

## Self-Improvement Bot

The Self-Improvement worker is implemented at:

`builder/runner/autobot-self-improvement.mjs`

It is deliberately **analysis-only**. It consumes the durable failure queue, AutoBot telemetry, resumable Builder state and available Reviewer evidence, groups recurring failure signatures, classifies likely failure layers, ranks evidence-backed proposals and writes:

`builder/working/autobot-self-improvement.json`

Output schema:

`autobot-self-improvement-v1`

Every proposal records evidence, confidence, expected impact and `requiresHumanReview: true`. `appliedChanges` remains empty and the worker has no repository-write, merge or push capability.

Verifier:

`scripts/autobot/verify-autobot-self-improvement.mjs`

Package command:

`verify:autobot-self-improvement`

## Coordinator

The Coordinator is:

`builder/runner/autobot-coordinator.mjs`

It remains **plan-only**. It reads the registry, durable failure queue and resumable Builder state and writes:

`builder/working/autobot-fleet-plan.json`

It may route repaired work to QA, open failures to Repair, resumable work to the protected Builder, or a validated explicit commit pair to Reviewer. It does not launch workers while the foundation is disabled.

## Fleet Registry

The authoritative registry is:

`builder/brain/autobot-fleet.json`

Every bot has an exact id, role, entrypoint, lifecycle status and declared ownership. Specialist Builders additionally have exact `ownsFiles` scope and `specialistBuilder: true`.

### Discoverability contract

Whenever a bot, entrypoint, path, protocol, handoff field or workflow integration is added, renamed or removed, update **all** dependent references in the same integration change. The authoritative registry, coordinator, validators, task/brain wording, workflow wiring, state/resume metadata and documentation must agree before activation.

A removed or renamed item must not remain discoverable through stale active wording.

## Safe activation path

1. Prove registry and queue primitives.
2. Prove isolated Repair and independent QA.
3. Prove adversarial Reviewer and explicit commit handoff.
4. Prove analysis-only Self-Improvement evidence.
5. Prove Specialist Builder isolation, scope enforcement and candidate handoff.
6. Add coordinator scheduling only after every worker contract is independently verified.
7. Add controlled parallelism only where `ownsFiles` scopes do not conflict and isolation is guaranteed.
8. Allow measured self-improvement proposals through a human-reviewed improvement lane.
9. Only then consider continuous autonomous orchestration.

No stage may weaken production gates, safety, rollback, audit or protected workflow controls merely to make the fleet appear successful.
