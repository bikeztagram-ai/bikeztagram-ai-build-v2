# Bikeztagram Autonomous Development Loop

## Goal

Turn the development branch into a controlled, evidence-driven improvement system:

`change -> Vercel preview -> real browser render -> structured QA -> diagnosis -> one guarded change -> commit -> repeat`

The product renderer and the development system evolve together. The development system must never declare success merely because a deployment builds.

## Control-plane architecture

The long-term design separates two concerns:

1. **Product branch (`ai-director-two-stage`)** — renderer, director, timeline, media pipeline and tests.
2. **Development control plane** — schedules/dispatches validation work, records evidence, enforces budgets and prevents concurrent autonomous mutations.

GitHub Actions is the orchestration layer and Vercel is the deployment/evaluation environment. Vercel preview deployments provide an isolated environment for each branch push. GitHub Actions supports workflow dispatch and concurrency controls, so the controller can keep the loop sequential rather than allowing competing AI edits.

## Required evidence before an improvement

A candidate improvement should have:

- deployment status;
- application-level full-test result;
- rendered video duration;
- playback advancement;
- video dimensions;
- expected-vs-actual scene coverage when available;
- browser/page errors;
- a failure screenshot when the browser test fails.

A build-only success is **not** enough.

## Safety rules

- One autonomous code mutation per evaluation cycle.
- A bounded action budget for each batch.
- Never modify secrets, deployment configuration, authentication, storage or billing foundations automatically.
- Never commit a change unless the repository still builds after the change.
- Prefer no-op when evidence is ambiguous.
- Keep production isolated from autonomous development work.
- Do not run concurrent autonomous mutations against the same branch.

## Background operation

The control plane is intended to run without the user being present. The user can return later and ask for `Continue` or `Status`; the repository remains the source of truth.

GitHub's workflow model has an important constraint: scheduled workflows and `workflow_run` workflows must exist on the default branch. Therefore the eventual always-on controller belongs on `main`, while it should explicitly target/check out the development branch. This avoids relying on a development-only scheduled workflow that GitHub cannot reliably schedule.

## Phased rollout

### Phase A — current

- push-triggered autonomous smoke test;
- Vercel preview discovery;
- browser-level full render test;
- truncated-video detection;
- guarded Gemini improvement;
- bounded action batches.

### Phase B — control plane

- default-branch controller;
- single-flight lock/concurrency;
- persistent run/evidence ledger;
- automatic dispatch of the development validation cycle;
- automatic pause after repeated identical failures.

### Phase C — autonomous engineering

- classify failures into renderer/director/infrastructure/test failures;
- select the smallest permitted change;
- compare before/after evidence;
- retain a change only when the measured result improves or fixes a known failure;
- automatically open a reviewable PR when confidence is insufficient for direct commit.

### Phase D — continuous product improvement

- scene-level visual QA;
- motion/stability scoring;
- transition quality scoring;
- audio/beat alignment checks;
- regression corpus of motorcycle clips;
- multiple candidate changes with tournament-style evaluation.

The loop should become increasingly autonomous, but autonomy is earned through measurable evidence rather than removing safeguards.
