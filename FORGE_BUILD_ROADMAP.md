# Forge — Build Roadmap

## Phase 0 — Evidence extraction

Use the Bikeztagram AutoBot as the reference implementation.

Deliverables:
- lessons/anti-patterns document
- capability inventory
- failure taxonomy
- verified contract inventory
- architecture decision record

Exit condition:
The Forge architecture explicitly traces important decisions back to evidence or a deliberate new design.

## Phase 1 — Minimal event-driven kernel

Build:
- task model
- worker registry
- durable event ledger
- artifact manifest
- dependency graph
- queue dispatcher
- state machine
- audit trail

Goal:
One builder can produce an artifact and another worker can consume it immediately.

## Phase 2 — Continuous-flow worker pool

Build:
- standby workers
- capability matching
- dynamic dispatch
- worker leasing
- isolated worktrees
- time budgets
- automatic next-task assignment

Goal:
No unrelated worker waits for a global stage.

## Phase 3 — Verification and repair

Build:
- independent QA
- adversarial reviewer
- failure queue
- repair workers
- exact commit handoff
- immutable candidate provenance
- rollback

Goal:
A failed task is repaired without stopping unrelated work.

## Phase 4 — Parallel development

Build:
- parallel research
- competing implementations
- temporary worker teams
- dependency-aware integration
- conflict resolution
- artifact fan-in

Goal:
Multiple useful streams progress simultaneously.

## Phase 5 — Engineering intelligence

Build:
- Chief Engineer
- architecture guardian
- bug detective
- technical-debt hunter
- performance laboratory
- strategic challenger
- worker capability history
- project memory

Goal:
The system makes better engineering decisions than a simple task queue.

## Phase 6 — Evolution laboratory

Build:
- telemetry analysis
- improvement proposals
- sandbox experiments
- A/B worker strategies
- benchmark comparison
- knowledge curator
- controlled adoption

Goal:
Each development period produces measurable improvements to the development system.

## Phase 7 — High-throughput application builder

Build:
- product brief ingestion
- automatic decomposition
- dynamic specialist fleet sizing
- predictive task allocation
- simulation/rehearsal
- full-stack project templates
- release candidate generation

Goal:
Build credible MVP applications rapidly while preserving evidence and quality.

## Phase 8 — Forge self-hosted build loop

Use Forge to build additional Forge capabilities under the same verification rules.

Goal:
Forge becomes capable of extending itself through controlled, evidence-backed development.

## Initial milestone

Do NOT target 100 workers first.

Target:

**1 project -> 5-10 concurrent workers -> continuous event flow -> verified artifacts -> repair without global blocking -> complete audit trail.**

Once that works reliably, scale worker count and specialisation using measured bottlenecks.
