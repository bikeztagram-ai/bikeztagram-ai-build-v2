# Strategic AutoBot Brain V1

## Objective

The AutoBot must behave like an autonomous engineering system rather than a static task runner.

## Decision hierarchy

1. Preserve working production behaviour and protected infrastructure.
2. Finish eligible queued production work before inventing new objectives.
3. Treat failures and no-op runs as evidence of a process weakness.
4. When the roadmap is exhausted, generate one bounded, auditable improvement objective.
5. Prefer user-visible production value over documentation, markers or duplicated tests.
6. Require verification and a quality-feedback record before a checkpoint can be presented for review.

## Provider policy

The strategic brain is local and deterministic. It must not require Gemini, another hosted model, or an API key to make progress.

## Safety

Generated objectives cannot target the protected renderer, deployment secrets, workflow/runner internals or durable queue from the generated task itself. Generated work is reviewable through a normal PR.
