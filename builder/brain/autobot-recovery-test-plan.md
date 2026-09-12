# AutoBot Controlled Recovery Exercise

## Purpose
Prove the recovery boundary before any autonomous fleet activation.

## Required flow
1. Proven Builder produces durable failure evidence.
2. Failure capture records an OPEN failure with an explicit product-file scope.
3. Recovery resolves Repair, QA and Reviewer from `builder/brain/autobot-fleet.json`.
4. Repair creates an isolated repair branch and records base/candidate commits.
5. QA independently reconstructs that exact patch and verifies it.
6. Reviewer consumes the explicit base/candidate pair and returns a disposition.
7. Recovery writes durable evidence and stops with `protectedIntegration:false`.

## Current gate
The production registry must remain `enabled:false` and `coordination.mode:'plan-only'` until a separate activation change is explicitly reviewed.

## Preflight already covered
- Registry-driven worker discovery.
- Exact registered entrypoints and exported worker contracts.
- Failure capture smoke test.
- Recovery-disabled gate smoke test.
- Main/V1/production contract verification.

## Activation boundary
The bounded end-to-end exercise must use a known synthetic failure and a disposable isolated worker environment. It must not merge or push the repair, modify protected Builder infrastructure, or bypass the explicit activation gate.
