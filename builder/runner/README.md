# AutoBot V2 run contract

## Mission
Build only declared Bikeztagram work, verify it, checkpoint it, and leave merge decisions to review.

## Loop

1. Load roadmap and queue.
2. Select the highest-priority eligible objective.
3. Execute ready implementation units in dependency order.
4. Record before/after state and verification evidence.
5. Checkpoint after every verified unit.
6. Publish live state and a run summary.
7. On failure, classify it and apply only an allowed bounded recovery strategy.
8. On objective completion, run the complete quality-gate chain.
9. Generate review evidence; never auto-merge or auto-deploy.
10. Analyse recurring failures and create review-only self-improvement proposals.

## Completion means evidence
A task is not complete because a command exited successfully. It requires declared implementation, repository change, verification evidence, and satisfied acceptance criteria. Objective completion requires the complete quality gate.

## Long runs
Requested durations above six hours must be implemented as resumable six-hour-or-less segments. A checkpoint is the source of truth for continuation; a new segment must never repeat a verified unit.

## Safety
The builder cannot modify protected automation/security paths through ordinary product tasks. Self-improvements require an isolated reviewable change and a regression test. Merge and deployment remain outside the builder's authority.
