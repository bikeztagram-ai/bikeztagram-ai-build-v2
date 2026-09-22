# Forge — Evidence and Lessons from Bikeztagram AutoBot

This document turns the current Bikeztagram AutoBot into explicit engineering requirements for Forge.

## Proven mechanisms to retain

### 1. Specialist isolation

Bikeztagram uses isolated specialist builders with declared ownership, separate worktrees, Aider processes and independent verification. Forge should retain this pattern.

### 2. Exact commit handoffs

A successful handoff records exact base/candidate commit identities. Reviewers reconstruct the candidate from immutable Git state rather than trusting a worker's local working tree.

**Forge requirement:** artifacts must carry immutable source identity and provenance.

### 3. Failure queue

Bikeztagram has an append-only failure queue with explicit lifecycle transitions:

`open -> claimed -> repairing -> repaired -> verified`

and terminal `rejected` / `blocked` states.

**Forge requirement:** failures become first-class work items, never hidden log messages.

### 4. Independent QA and adversarial review

Bikeztagram separates Builder, Repair, QA and Reviewer responsibilities.

**Forge requirement:** the worker that writes a change must not be the only worker deciding that the change is good.

### 5. Completed-work manifest

Verified candidates are aggregated into a central completed-work manifest while source changes remain isolated.

**Forge requirement:** use an artifact inbox/fan-in ledger so completed work is immediately discoverable without merging it prematurely.

### 6. R&D before planning

Bikeztagram has an evidence-first R&D lane that produces a durable research brief before persistent cycles.

**Forge requirement:** research can feed planning without becoming a write-capable dependency.

### 7. Self-improvement as analysis first

Bikeztagram's self-improvement lane analyses failures and telemetry and records proposals requiring human review.

**Forge requirement:** evolution begins with observation and experiments, not unrestricted self-editing.

### 8. Persistent/resumable state

Bikeztagram has resumable Builder state and endurance/cycle machinery.

**Forge requirement:** every long-running operation must checkpoint enough state to resume safely.

### 9. Explicit gates

The current fleet has explicit activation and protected-integration gates.

**Forge requirement:** development autonomy and production integration are separate permissions.

## Failures / anti-patterns to encode as guardrails

### 1. Do not trust green workflow status alone

A workflow can be green while the end-to-end chain is still wrong. Forge must validate the whole chain and artifact lineage, not just individual job exit codes.

### 2. Do not infer state from undocumented worker state

Bikeztagram explicitly hardened the Reviewer handoff around full base/candidate SHAs instead of inferred state.

**Forge rule:** state transitions use explicit contracts.

### 3. Do not use generated patches as the authoritative transport for verified candidates

Exact commits are more reconstructable and auditable.

### 4. Do not let one failure stop unrelated work

The future Forge must be event-driven and dependency-aware. A failed worker creates repair work while unrelated lanes continue.

### 5. Do not make downstream stages wait for an entire batch

A verified artifact should enter its review queue immediately. A repaired artifact should enter QA immediately. Batch completion is not a prerequisite for unrelated work.

### 6. Do not allow workers to silently expand scope

Declared ownership, dependency contracts and changed-file checks are mandatory.

### 7. Do not silently carry incomplete work into the next cycle

If work is unresolved, its status remains unresolved with evidence. It may be retried or repaired, but never reclassified as completed merely to make a run green.

### 8. Do not let evolution weaken safety controls

Evolution agents can propose improvements, but cannot remove verification, rollback, isolation, human gates or audit requirements.

### 9. Do not optimise for worker count

Measure throughput, first-pass success, repair rate, regression rate, cycle time, blocked time, cost and quality. Add or remove workers based on evidence.

### 10. Do not make one giant orchestration process the only source of truth

State should be durable and reconstructable from the event/artifact ledger.

## Requirements imported from the user's Forge design

- Large standby specialist pool.
- Dynamic worker activation.
- Parallel research/build/test/review/repair.
- Immediate artifact publication after a verified unit of work.
- Immediate repair routing after a failure.
- No global stage barrier.
- Dependency-aware blocking only.
- Multiple competing implementations for difficult tasks.
- Strategic challenger for the Master Brain.
- Bug detective.
- Technical-debt hunters.
- Architecture guardians.
- Performance laboratory.
- Security/adversarial testing.
- Worker capability profiles and performance history.
- Temporary specialist teams.
- Knowledge curator and compressed engineering memory.
- Definition-of-done engine.
- Project-specific memory.
- Predictive task allocation.
- Simulation/rehearsal before risky execution.
- Fleet dashboard and observability.
- Controlled A/B experiments on worker strategies.
- Evolution loop that measures whether the fleet itself is improving.
