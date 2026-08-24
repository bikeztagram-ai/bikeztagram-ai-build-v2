# Autonomous Builder Operating Model

## Purpose

The autonomous builder exists to advance Bikeztagram AI in large, reviewable development batches. It is a build-and-propose system, not a continuously running production service.

## Operating cycle

1. Inspect the current repository and existing verification coverage.
2. Select one coherent batch of work with a clear user-visible outcome.
3. Implement the batch on an isolated builder branch.
4. Run the relevant existing verification scripts and add focused checks where needed.
5. Stop after the batch reaches a clean checkpoint.
6. Open or update a draft pull request with the batch summary, verification results, risks, and manual test instructions.
7. Wait for human/ChatGPT review before the next batch is accepted as integrated work.

## Safety boundaries

- Never write directly to `main`.
- Never automatically merge a pull request.
- Never run as a 24/7 worker.
- Do not continuously deploy experimental builder work to production.
- Do not spend money on optional infrastructure or paid AI services without an explicit decision to do so.
- Treat credentials and environment variables as secrets; never commit their values.
- Preserve existing working infrastructure unless the current batch explicitly requires a change.

## Batch sizing

A batch should be large enough to make meaningful progress but small enough that it can be tested as one unit. A normal batch should target a handful of related capabilities rather than one tiny edit or an uncontrolled collection of unrelated features.

A batch must have:

- a written objective;
- explicit files/modules likely to change;
- acceptance criteria;
- automated verification;
- a manual test checklist;
- a defined stop point.

## Integration rule

Builder work stays isolated until the checkpoint has been reviewed. Once a batch is accepted, it can be merged deliberately and the next batch starts from the newly accepted baseline.

## Current project direction

The repository already contains a substantial staged verification suite and protected infrastructure around Blob uploads, AI analysis, rendering, captions, music, exports, and related pipeline contracts. Future builder batches should extend that architecture rather than duplicate it.

The first production-oriented builder batches should therefore focus on the highest-value missing capability after a fresh repository audit, with existing verification used as the regression floor.
