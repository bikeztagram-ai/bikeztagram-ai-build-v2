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
4. Run deterministic syntax/self-tests.
5. Reject and revert failed experiments.
6. Persist the outcome and next hypothesis.
7. Never modify production workflows, production specialists, secrets, or files outside builder/trial-builder.

## Promotion rule
A successful trial is evidence, not permission to change the production AutoBot. Production promotion remains a separate human-reviewed change.
