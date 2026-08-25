# Bikeztagram AI — Task-Driven Autobot

## Purpose

Autobot is an execution worker, not the product roadmap owner. The durable queue supplies the objective and acceptance contract. The runner supplies the bounded execution loop, verification loop, Git isolation and release controls.

## Operating model

`Master roadmap / queued objective -> task-driven runner -> execution agent -> code -> verification -> repair -> PR`

The execution agent must not spend passes deciding what Bikeztagram should build next. It receives an explicit objective and acceptance criteria and works directly against them.

## Large-build strategy

A large product initiative is decomposed into durable queue batches. Each batch is deliberately coherent and independently reviewable. Within a batch, the runner can give the execution agent up to eight bounded passes in one isolated sandbox. The repository checkpoint at `builder/working/<batch-id>.md` records progress so later passes can continue without repeating planning or rereading the whole repository.

This allows work larger than one ChatGPT session: the repository is the durable memory, the queue is the durable plan, and each pass is a short execution cycle.

## Execution-agent contract

1. Execute the supplied objective directly.
2. Treat acceptance criteria as authoritative.
3. Inspect only relevant files.
4. Make substantive production changes, not cosmetic work.
5. Preserve working contracts unless the objective requires a change.
6. Run useful checks and respond to verification failures with fixes.
7. Record concise progress in the checkpoint.
8. Never decide unrelated roadmap work.
9. Never merge, deploy production or modify protected workflow infrastructure.
10. Never commit or push; the runner owns Git.

## Provider strategy

The control plane is provider-neutral. `BUILDER_AGENT_CMD` may select an execution agent. Gemini is retained only as the current backwards-compatible fallback; it is not the source of product direction. When another execution provider is configured, the same objective, acceptance contract, checkpointing and verification loop are reused unchanged.

## Safety and release boundaries

- `main` is never written directly by the runner.
- Product batches run on `autonomous-builder/<batch-id>` branches.
- `.github/workflows/**` is protected during product batches.
- No automatic merge is performed.
- No automatic production deployment is performed.
- Quota/rate-limit failures stop the retry loop rather than wasting remaining passes.
- Verification remains authoritative before a batch is published for review.
