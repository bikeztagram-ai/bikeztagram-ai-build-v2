# Forge — Architecture V1

## 1. High-level model

Forge is an event-driven autonomous engineering system.

```
Project Goal
   |
   v
Chief Engineer / Master Brain
   |
   +--> Research
   +--> Architecture
   +--> Task Graph
   |
   v
Dynamic Specialist Pool
   |
   +--> Build
   +--> Design
   +--> Backend
   +--> Frontend
   +--> AI
   +--> Database
   +--> Security
   +--> Testing
   +--> Performance
   +--> DevOps
   +--> Documentation
   |
   v
Artifact/Event Bus
   |
   +--> Review
   +--> QA
   +--> Security
   +--> Repair
   +--> Integration
   |
   v
Verified Release Candidate
   |
   +--> Human protected-integration gate
   |
   v
Engineering Memory
   |
   v
Evolution / Experimentation
   |
   +----> improved policies, routing, prompts, worker selection
```

## 2. Continuous-flow rule

Forge must never use a global barrier such as "wait until all builders finish."

Every task has a dependency set.

When its own prerequisites are satisfied, it becomes runnable immediately.

When a worker finishes:

- success -> publish artifact event immediately;
- failure -> publish failure event immediately;
- blocked -> record dependency and return worker to available capacity;
- infrastructure failure -> route to infrastructure recovery.

The worker is then eligible for another compatible task.

## 3. Artifact state machine

Minimum states:

`created -> claimed -> building -> artifact-ready -> testing -> review -> verified -> integration-candidate -> integrated`

Failure path:

`building/testing/review -> failed -> repair-queued -> repairing -> repaired -> testing`

Terminal outcomes:

`rejected`, `blocked`, `cancelled`

Every transition records:

- artifact id
- task id
- worker id
- timestamp
- parent artifact(s)
- source/base commit
- candidate commit
- changed files
- verifier result
- evidence references
- reason

## 4. Worker model

Workers are capability profiles, not fixed identities.

A profile contains:

- id
- capability
- version
- permitted tools
- permitted scope
- preferred model/runtime
- historical performance
- failure signatures
- compatible reviewers
- current availability
- concurrency limit

Forge maintains standby capacity and activates workers according to task demand.

## 5. Isolation

Each write-capable worker receives:

- isolated branch/worktree
- explicit task contract
- explicit file/module scope
- base commit
- time budget
- verification contract

No worker can write outside its declared scope.

## 6. Research and simulation

Before risky implementation, Forge may run parallel research and simulation tasks.

Simulation outputs are evidence, not production changes.

Research does not block unrelated implementation unless the task explicitly depends on it.

## 7. Review model

Use multiple independent views:

- correctness reviewer
- architecture guardian
- security reviewer
- adversarial tester
- performance reviewer
- product/UX reviewer where applicable

Not every change requires every reviewer. The Master Brain selects the minimum sufficient review set from the risk model.

## 8. Repair model

Repair is a queue, not a global stop condition.

A failure record contains the exact evidence required to reproduce it.

Repair workers consume failures independently.

Successful repairs immediately re-enter the relevant verification queue.

Repeated failures are escalated to diagnosis/research rather than endlessly retried.

## 9. Integration

Integration is dependency-aware.

A verified artifact can be staged independently while other work continues.

Conflicting artifacts are merged through a dedicated integration worker in an isolated worktree.

No production/protected branch is changed without the protected integration gate.

## 10. Evolution

Evolution has four stages:

1. Observe — collect telemetry and failures.
2. Propose — generate measurable improvement hypotheses.
3. Experiment — test in an isolated sandbox.
4. Adopt — only after benchmark evidence and required approval.

Evolution must be able to improve:

- worker prompts
- routing
- worker selection
- test selection
- concurrency
- queue policies
- research strategies
- repair strategies
- model/runtime choice

It must not silently remove safety controls.

## 11. Performance objectives

Primary metrics:

- end-to-end task cycle time
- worker utilisation
- blocked time
- first-pass success
- repair time
- regression rate
- review latency
- integration latency
- test latency
- throughput per hour
- cost per verified change
- quality score

The system should optimise for useful verified throughput, not raw agent activity.

## 12. Human control

Human review remains required for protected integration until the system has demonstrated sufficient evidence for any narrower automation.

Forge must always retain rollback and auditability.
