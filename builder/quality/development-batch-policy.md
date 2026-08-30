# Bikeztagram Development Batch Policy

The repository is developed in large, coherent, verified batches.

## Required lifecycle

`development branch → pull request → automated build → release gate → fix/retest → merge when verified → next batch`

## Continuation rule

Every development pass first checks open pull requests and active branches for unfinished or verified work. Do not duplicate existing batches or silently abandon verified work.

## Merge rule

A batch is complete only after the production build and authoritative release gate pass and the change has been checked for product integration. Verified production-ready batches should be merged into `main`.

## Quality rule

Optimise for verified product progress, not commit count. Prefer large coherent batches while keeping changes testable and reversible.

## Protected baseline

`main` is the protected working baseline. Failed or unverified work remains isolated until repaired.