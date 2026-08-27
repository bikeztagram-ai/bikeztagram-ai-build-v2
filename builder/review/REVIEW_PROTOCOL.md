# AutoBot Review Staging Protocol

A completed run is not automatically mergeable. Every publishable run must leave a review package describing exactly what changed and what was proven.

## Required review evidence

- objective and task acceptance criteria;
- created, modified and deleted files;
- git diff/statistics;
- commands executed and pass/fail results;
- production build result;
- relevant unit/integration/browser evidence when available;
- known limitations and unresolved warnings;
- checkpoint and resume state;
- lessons proposed by the run.

## Statuses

- `BUILDING`: work is still in progress.
- `BLOCKED`: the worker stopped on a genuine blocker and must not publish a ready PR.
- `AWAITING_REVIEW`: work and required verification completed; human/independent review is required.
- `REPAIR_REQUIRED`: review found a defect; resume from checkpoint rather than starting over.
- `APPROVED`: reviewer has accepted the implementation for normal PR/merge checks.

## Hard rule

A green build alone never means `AWAITING_REVIEW`. Acceptance criteria and integration evidence must also be recorded. The builder must never merge `main` or deploy production as part of this protocol.
