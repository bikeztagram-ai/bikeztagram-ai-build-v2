# Autonomous Builder Operating Contract

This repository is developed in controlled batches.

## Safety boundary

- `main` is the protected integration line and must not be modified directly by the autonomous builder.
- Builder work must occur on a dedicated working branch and be proposed through a pull request for review.
- Do not merge builder work into `main` automatically.
- Do not enable continuous or 24/7 execution.
- Each batch must have a clearly defined goal, bounded scope, verification steps, and a stop condition.
- Never commit secrets, API keys, tokens, credentials, or `.env` contents.
- Existing working functionality must be preserved unless the batch explicitly targets it.

## Batch lifecycle

1. Inspect the current repository and identify the smallest useful next improvement.
2. Write a short batch plan and acceptance criteria.
3. Implement only that batch on the builder branch.
4. Run the relevant existing verification scripts and the production build.
5. Record what changed, what passed, and any known limitations.
6. Open a pull request against `main` (preferably as a draft until verified).
7. Stop. No automatic merge.

## Project integration

The builder is an engineering workflow around the existing Bikeztagram AI project. It is not a replacement runtime for the application and should not introduce an always-on service merely to perform development work.

## Cost control

Builder execution must be batch-based and explicitly invoked. Any optional cloud/AI operation must use existing project spend controls and must fail safely when credentials or budget are unavailable.
