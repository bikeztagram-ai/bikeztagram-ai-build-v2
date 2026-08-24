# Autonomous Builder Runner

This directory defines the bounded execution contract for the Bikeztagram autonomous builder.

## Operating model

Each invocation is one batch. It must:

1. Start from an approved base branch/commit.
2. Create/use a dedicated batch branch.
3. Run inside a short-lived Vercel Sandbox.
4. Work only within the batch objective and acceptance criteria.
5. Run the repository verification/build checks.
6. Fix failures that are inside scope.
7. Commit the completed work to the batch branch.
8. Stop the Sandbox immediately when the batch completes or the stop condition is reached.
9. Never merge to `main` automatically.

## Default limits

- Maximum wall-clock Sandbox duration: 60 minutes for the first batches.
- Keep-alive: OFF.
- One batch per invocation.
- No production deployment from the runner.
- No Vercel Blob or other new paid resource is created by the runner.
- Credentials are injected only where required and are not copied into the repository or Sandbox filesystem.

The 60-minute limit is intentionally conservative. It can be raised to 120 minutes later after we have observed real usage and reliability.

## Required result

Every run must leave a machine-readable report containing:

- batch identifier
- base commit
- working branch
- files changed
- commands/checks run
- pass/fail results
- remaining issues
- whether the batch is ready for human review

A successful run ends at **READY_FOR_REVIEW**, not **MERGED**.
