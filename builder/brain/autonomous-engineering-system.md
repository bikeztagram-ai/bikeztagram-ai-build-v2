# Bikeztagram AI — Autonomous Engineering System

## Purpose

The autonomous builder must be able to make substantial, reviewable progress without requiring a paid external coding model. The system is therefore specification-driven: project direction is defined by durable engineering plans, while the runner executes explicit implementation units, verification, checkpointing and Git isolation.

## Operating loop

`roadmap -> selected objective -> implementation units -> local verification -> checkpoint -> next unit -> review PR`

A unit is complete only when its production acceptance evidence is satisfied. A large objective may contain many units and may run for a long time, but each unit must leave a durable checkpoint so the run can resume safely.

## Source of truth

1. `builder/brain/project-state.md` — current architecture and contracts.
2. `builder/brain/roadmap.json` — ordered product objectives and dependencies.
3. `builder/brain/lessons.md` — durable failures and successful patterns.
4. `builder/brain/task-library.json` — concrete implementation recipes and verification contracts.
5. `builder/working/<batch-id>.md` — transient execution checkpoint for the active objective.

The queue remains the durable record of reviewable batch objectives. The brain files make each objective executable without asking an external model to rediscover the repository.

## Implementation-unit contract

Every implementation unit must declare:

- stable id and objective id;
- production files allowed to change;
- protected files/paths;
- exact behaviour to implement;
- dependencies on earlier units;
- deterministic commands to run;
- observable acceptance evidence;
- safe retry behaviour;
- checkpoint data to record;
- whether the unit may continue automatically to the next unit.

Units should be large enough to produce meaningful product progress, but small enough that a failed unit can be diagnosed and resumed without losing the objective.

## Verification hierarchy

1. Syntax/static checks.
2. Focused unit/contract checks.
3. Production build.
4. Behavioural/integration verification.
5. Diff/protected-path audit.
6. Review PR.

A green build alone is never completion evidence for a user-visible feature.

## Self-improvement

The builder may analyse its own run reports and durable lessons and propose improvements to task selection, verification, checkpointing, diagnostics and efficiency. Self-improvement is itself an implementation objective and must use the same review process as product work.

The builder must never automatically relax or rewrite these safety boundaries:

- protected `main` branch;
- credentials/secrets handling;
- workflow permissions;
- protected builder infrastructure;
- automatic merge/deployment policy;
- the self-improvement safety contract.

## Long-running behaviour

A long run is a sequence of verified units, not one unbounded script. The runner should:

- persist state after every successful unit;
- resume from the last verified unit after interruption;
- avoid repeating completed units;
- stop on a genuine blocker with an actionable report;
- continue through independent units when verification passes;
- create reviewable checkpoints before the workflow timeout;
- never claim work was completed if it was only planned.

## Gemini policy

Gemini is optional and must not be a prerequisite for product development. No workflow should fail merely because `GEMINI_API_KEY` is absent. If an optional provider is present it may be used for advisory analysis, but deterministic implementation and verification must remain possible without it.
