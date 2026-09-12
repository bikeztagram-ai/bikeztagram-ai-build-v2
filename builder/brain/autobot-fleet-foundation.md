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

The runner resolves the bot from the authoritative registry and uses its exact `ownsFiles` scope. It refuses unknown/unverified/protected bots, unsafe paths and out-of-scope modifications. Each run starts from the protected checkout `HEAD`, creates a disposable `autobot-specialist/<bot-id>-<timestamp>` worktree/branch, runs Aider without auto-commit, checks the isolated diff, runs `git diff --check`, installs dependencies with `npm install --no-audit --no-fund --no-package-lock`, then runs `npm run build` and the configurable product-quality check before creating a candidate commit. It removes the disposable worktree and never merges or pushes.

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
`src/editorialRhythm.js`
`src/renderer.js`

These are complementary specialist Builders rather than competing copies of the protected Builder. Their scopes are intentionally narrow enough to permit future isolated parallelism without allowing two workers to silently edit the same product surface.

## Specialist Builder Handoff

The specialist Builder writes its verified candidate handoff through:

`builder/runner/autobot-specialist-handoff.mjs`

The durable handoff output is:

`builder/working/autobot-specialist-handoff.json`

The handoff schema is:

`autobot-specialist-handoff-v1`

A verified specialist candidate records the exact `baseCommit`, `candidateCommit`, preserved branch name, declared `ownsFiles`, product-quality verification command and the downstream Reviewer contract:

`AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT`

The handoff is validated before it is written. Its verifier is:

`scripts/autobot/verify-autobot-specialist-handoff.mjs`

Package command:

`verify:autobot-specialist-handoff`

The authoritative registry records the exact handoff output, contract and verifier paths under `coordination`. These paths must stay aligned with the producer and verifier whenever they are changed.

## Failure Queue

Unresolved worker failures are intended to become structured handoff evidence rather than disappearing at the end of a run.

The V1 primitive is:

`builder/runner/autobot-failure-queue.mjs`

The default evidence path is:

`builder/working/autobot-failure-queue.jsonl`

A failure record contains a stable schema version, source/run/objective/task identifiers, stage, error, expected/actual information when available, affected files, attempted actions, evidence references, retryability and a repair hint when one exists.

The queue is append-only. A repair or QA worker must never rewrite historical failure evidence. State transitions are represented by a new record with the same failure id, and existing handoff metadata such as `repairBranch`, `repairBaseCommit` and `repairCommit` is preserved unless a transition explicitly replaces it.

The supported lifecycle is:

`open -> claimed -> repairing -> repaired -> verified`

with terminal/blocked outcomes:

`rejected` or `blocked`.

Illegal backwards or skipped transitions are rejected by the queue contract.

The `repaired` handoff records exact `repairBaseCommit` and `repairCommit`, allowing independent QA to reconstruct the repair without trusting the Repair Bot's working tree.

## Fleet Recovery Orchestrator

The controlled handoff bridge between the proven Builder and the verified repair fleet is:

`builder/runner/autobot-fleet-recovery.mjs`

The authoritative registry records this exact path as `coordination.recoveryRunner`.

Its intended flow is:

`Builder failure evidence -> Failure Queue -> Repair Bot -> QA Bot -> Reviewer Bot`

The recovery runner can capture a durable Builder failure from `builder/working/deterministic-autobot.json` and the failing task's declared file scope, then invoke the existing isolated Repair Bot, independent QA and explicit base/candidate Reviewer handoff. It never merges or pushes the candidate and reports `protectedIntegration:false` until a separate human-reviewed integration stage is introduced.

The recovery runner is **behind the same explicit fleet activation gate** as the specialist workers: the registry must be `enabled:true` with `coordination.mode:'active'`. The current foundation remains disabled and plan-only.

Verifier:

`scripts/autobot/verify-autobot-fleet-recovery.mjs`

Package command:

`verify:autobot-fleet-recovery`

This verifier proves that the new runner is discoverable, calls the authoritative Repair/QA/Reviewer implementations, preserves the explicit commit handoff wording and remains blocked while the foundation is inactive.

## Repair Bot

The Repair Bot is implemented at:

`builder/runner/autobot-repair.mjs`

It claims one open failure, validates file scope, creates an isolated worktree, repairs only declared failure files, checks the isolated diff, installs dependencies in that worktree, runs build and product-quality verification, commits only after checks pass, records the repair base/candidate commits and preserves the repair branch for independent QA. It never merges or pushes and cannot modify protected infrastructure through its declared scope.

Verifier:

`scripts/autobot/verify-autobot-repair-bot.mjs`

Package command:

`verify:autobot-repair-bot`

## Independent QA Bot

The QA worker is implemented at:

`builder/runner/autobot-qa.mjs`

It consumes only `repaired` handoffs, verifies the repair branch and recorded commit ancestry, reconstructs the patch in a fresh detached worktree, checks diff scope, installs dependencies, runs `git diff --check`, build and product-quality verification, then records `verified` or `rejected`. It never merges or pushes.

Verifier:

`scripts/autobot/verify-autobot-qa.mjs`

Package command:

`verify:autobot-qa`

## Adversarial Reviewer Bot

The Reviewer is implemented at:

`builder/runner/autobot-reviewer.mjs`

It does not edit the candidate. It independently inspects an explicit base/candidate commit pair in a disposable worktree, checks the real diff and build, installing dependencies inside that worktree first, and challenges known Bikeztagram product-quality failure modes such as fixed story templates, evidence-free selection and duration-blind planning.

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

It is deliberately **analysis-only**. It consumes the durable failure queue, AutoBot telemetry, the same resumable Builder state used by the protected Builder (`builder/working/aider-feature-brain-state.json`, configurable via `AUTOBOT_STATE_PATH`) and available Reviewer evidence, groups recurring failure signatures, classifies likely failure layers, ranks evidence-backed proposals and writes:

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

It remains **plan-only**. It reads the registry, durable failure queue and resumable Builder state (`builder/working/aider-feature-brain-state.json`) and writes:

`builder/working/autobot-fleet-plan.json`

It may route repaired work to QA, open failures to Repair, resumable work to the protected Builder, or a validated explicit commit pair to Reviewer. It does not launch workers while the foundation is disabled.

## Foundation Validation Workflow

The dedicated manual validation workflow is:

`.github/workflows/autobot-fleet-foundation-validation.yml`

It is the correct test entrypoint for the fleet foundation. It does **not** run the normal product Builder objective loop. It runs the registered fleet verifiers, exercises the Coordinator in plan-only mode, confirms the protected Builder remains preserved, and runs a production build.

The workflow now also verifies the controlled Fleet Recovery Orchestrator contract without executing it.

The workflow is deliberately separate from:

`.github/workflows/autonomous-builder-v2-fast.yml`

The proven production Builder workflow remains the only workflow allowed to run the current autonomous product Builder. The fleet validation workflow must never activate or replace it.

## Fleet Registry

The authoritative registry is:

`builder/brain/autobot-fleet.json`

Every bot has an exact id, role, entrypoint, lifecycle status and declared ownership. Specialist Builders additionally have exact `ownsFiles` scope and `specialistBuilder: true`.

The registry also records the exact `coordination.recoveryRunner` path so the Builder -> Failure Queue -> Repair -> QA -> Reviewer bridge cannot drift to an undocumented runner.

### Discoverability contract

Whenever a bot, entrypoint, path, protocol, handoff field or workflow integration is added, renamed or removed, update **all** dependent references in the same integration change. The authoritative registry, coordinator, validators, task/brain wording, workflow wiring, state/resume metadata and documentation must agree before activation.

A removed or renamed item must not remain discoverable through stale active wording.

## Safe activation path

1. Prove registry and queue primitives.
2. Prove isolated Repair and independent QA.
3. Prove adversarial Reviewer and explicit commit handoff.
4. Prove analysis-only Self-Improvement evidence.
5. Prove Specialist Builder isolation, scope enforcement and candidate handoff.
6. Prove the Fleet Recovery Orchestrator's Builder failure -> Repair -> QA -> Reviewer handoff.
7. Run the dedicated Foundation Validation Workflow and require all foundation contracts plus the production build to pass.
8. Add coordinator scheduling only after every worker contract is independently verified.
9. Add controlled parallelism only where `ownsFiles` scopes do not conflict and isolation is guaranteed.
10. Allow measured self-improvement proposals through a human-reviewed improvement lane.
11. Only then consider continuous autonomous orchestration.

No stage may weaken production gates, safety, rollback, audit or protected workflow controls merely to make the fleet appear successful.
