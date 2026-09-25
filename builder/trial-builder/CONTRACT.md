# Forge Trial Builder Contract

This is an isolated experimental software-engineering bot. It may evolve only files under builder/trial-builder on its persistent branch.

## Inputs
- Nine research-lane evidence files from the current Forge run.
- Previous trial state.
- This contract and the current trial implementation.

## Required lifecycle
1. Read the current trial implementation before editing.
2. Read and classify research evidence before selecting an experiment.
3. Make one bounded self-improvement experiment.
4. Prove the edit is novel and materially changes executable behaviour; reject formatting-only, duplicate, redundant or no-op changes.
5. Run deterministic syntax/self-tests.
6. Reject and revert failed or non-meaningful experiments.
7. Persist the outcome, evidence of the change, and next hypothesis.
8. After a model timeout, adapt the next experiment rather than blindly repeating the same expensive request.
9. Never modify production workflows, production specialists, secrets, or files outside builder/trial-builder.

## Promotion rule
A successful trial is evidence, not permission to change the production AutoBot. Production promotion remains a separate human-reviewed change.
