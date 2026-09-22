# FORGE — Autonomous Software Engineering System

## Status

Foundation planning and architecture v1.

Forge is the planned reusable evolution of the Bikeztagram AutoBot architecture. This branch is a design/staging branch only. It must not modify Bikeztagram `main` or activate a second autonomous fleet inside the production app.

## Mission

Build a reusable, evidence-driven software engineering system that can take a product goal, research and decompose it, dynamically activate specialist workers, move completed/failed work through independent queues without global stage blocking, verify every artifact, repair failures, integrate safe candidates, and continuously improve the engineering process itself.

## Core principle

**Continuous flow, not stage-wide waiting.**

A worker finishing a verified artifact immediately publishes it to the appropriate review/integration queue. A failure immediately becomes repair work. Unrelated workers continue on independent work. Only genuine dependency edges block a task.

## First engineering rule

Forge is not "100 agents coding at once." It is an orchestration, evidence, verification and evolution system that can dynamically use a large standby specialist pool.

## Source of truth for lessons

The Bikeztagram AutoBot repository is the reference implementation and failure laboratory. Forge must preserve proven mechanisms where evidence supports them and explicitly avoid mechanisms that caused repeated failures.

## Initial safety posture

- Human review remains required for protected integration.
- No automatic self-modification of the Forge core.
- Evolution proposals are sandboxed, benchmarked and reviewable.
- Every artifact has immutable identity and provenance.
- Every state transition is auditable.
- Workers are isolated by worktree/branch and explicit file/task scope.
- Failed work is never silently carried forward as success.
