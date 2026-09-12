# AutoBot Fleet — Controlled Recovery Handoff

## Purpose

This document defines the exact handoff between the proven Builder failure path and the verified Repair -> QA -> Reviewer recovery fleet.

The controlled workflow is:

`.github/workflows/autobot-fleet-recovery.yml`

The authoritative runner is:

`builder/runner/autobot-fleet-recovery.mjs`

The authoritative registry is:

`builder/brain/autobot-fleet.json`

## Trigger contract

The controlled recovery workflow has two entrypoints:

1. `workflow_run` for a failed `🏍️ BIKEZTAGRAM AUTOBOT — PROVEN` run.
2. `workflow_dispatch` for an explicit operator-triggered recovery using a Builder workflow run id.

A Builder failure artifact must use the exact name:

`autobot-builder-failure-${BUILDER_RUN_ID}`

The proven Builder workflow creates that artifact only after its failure-capture operation runs.

## Activation gate

The recovery workflow is installed but must remain dormant while the fleet registry contains:

`enabled: false`

and:

`coordination.mode: plan-only`

Full recovery is permitted only when both conditions become true:

`enabled: true`

`coordination.mode: active`

The workflow checks this exact condition before invoking:

`node builder/runner/autobot-fleet-recovery.mjs recover`

If the gate is not active, the workflow reports that recovery is blocked and does not invoke Repair, QA or Reviewer.

## Evidence handoff

The workflow downloads the Builder failure artifact into the checked-out repository. The artifact supplies the deterministic checkpoint, deterministic evidence, authoritative failure queue and capture result needed by the recovery runner.

The recovery runner then uses the authoritative Failure Queue and the registered worker entrypoints:

`builder/runner/autobot-repair.mjs`

`builder/runner/autobot-qa.mjs`

`builder/runner/autobot-reviewer.mjs`

Reviewer handoff must use the exact pair:

`AUTOBOT_REVIEW_BASE_COMMIT`

`AUTOBOT_REVIEW_COMMIT`

Both values must be full 40-character commit SHAs.

## Safety boundary

Controlled recovery never merges or pushes a repaired candidate. The recovery result must report:

`protectedIntegration:false`

Repair and QA remain isolated, Reviewer remains adversarial, and the fleet cannot weaken production validators or protected workflow controls to manufacture a pass.

## Activation procedure

Do not activate the fleet merely because this workflow exists.

Before activation:

1. Run the dedicated Fleet Foundation Validation Workflow.
2. Require the foundation verifier and production build to pass.
3. Confirm the failure-capture smoke test passes.
4. Confirm the controlled recovery workflow and exact activation gate are verified.
5. Make a separate reviewed registry change from `enabled:false` / `plan-only` to `enabled:true` / `active`.
6. Run one controlled recovery against a known, bounded Builder failure and inspect Repair, QA and Reviewer evidence before considering wider autonomous recovery.

The activation change is deliberately separate from this integration so installing the handoff cannot silently enable autonomous repair.
