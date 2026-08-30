# Bikeztagram Development Batch Policy

This file is the repository-level source of truth for development-batch handling.

## Required lifecycle

`development branch → pull request → automated build → release gate → fix/retest if needed → merge when verified → next batch`

## Merge rule

A batch is not considered complete merely because its branch exists or GitHub reports it as mergeable. It is complete only when the development release gate passes and the change is reviewed for product integration. Verified production-ready batches should be merged into `main` rather than left indefinitely in open branches.

## Continuation rule

Every new development pass must first inspect open pull requests and existing branches for unfinished or already-verified work before starting unrelated work. Do not duplicate an existing batch. Do not silently abandon a verified batch.

## Quality rule

The goal is verified product progress, not commit count. Large coherent batches are preferred, but they must remain testable and reversible.

## Protected baseline

`main` remains the protected working baseline. Failed or unverified work stays isolated until repaired.
