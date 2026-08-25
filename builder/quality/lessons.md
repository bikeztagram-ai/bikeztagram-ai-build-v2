# Autonomous Builder Quality Lessons

This file is durable guidance for every future Bikeztagram AI batch. It exists so lessons from weak batches do not disappear into chat history.

## Non-negotiable quality bar

- A green workflow is not proof that the product change is good. Review the actual implementation against the product objective and existing architecture.
- Prefer real end-to-end behaviour over type/schema/test-only work. A feature is not complete merely because contracts or unit tests exist.
- Preserve working behaviour and existing contracts unless the batch explicitly requires a change.
- Make substantive production-code improvements. Do not satisfy a batch with documentation, placeholders, interfaces, or tests alone.
- Integration matters: new planner/director/music/rendering capabilities must reach the real user-facing pipeline where the objective requires it.
- Verify the actual runtime path, not only the function that produces an intermediate plan.
- If a previous batch exposes a gap between technical correctness and product quality, future prompts must explicitly close that gap.
- Do not invent unrelated roadmap work. Each batch must have an exact implementation target.
- The builder must inspect relevant existing code before changing it and use check-fix-check-continue rather than stopping at the first passing check.
- Never automatically merge a product batch. The batch must produce a reviewable PR.

## Lessons already learned

### Batch 84–85: music direction
- Music work must be judged by the finished audible result and how timing metadata influences the director, not only by generated audio files or metadata contracts.
- Preserve deterministic procedural fallback behaviour and make generated/provider behaviour distinguishable and auditable.

### Batch 86: original generated-scene foundation
- Original-scene capability must remain genuinely original and provider-safe. Do not imply that unsupported copyrighted game/film assets can be generated.
- Provider capability boundaries must be truthful, with useful deterministic fallbacks rather than pretending generation succeeded.

### Batch 87: renderer/editor integration
- Planner improvements are not enough if the real renderer does not consume the new edit instructions.
- When a batch changes an edit plan, verify the complete path: source media -> analysis/planning -> edit contract -> renderer -> final output.
- Do not accept a result simply because build/tests are green if the new behaviour is not observable in the actual product path.

### Batch 88 onward
- End-to-end pipeline validation is the priority: prove that the new capabilities work together in a realistic user workflow.
- Prefer integration fixes over isolated feature sprawl.

## How Gemini should be used

- Use Gemini as a bounded architecture/quality advisor, not as an unlimited second builder.
- One focused architecture-quality pass per batch is preferred before execution so the builder receives an implementation-ready brief grounded in the current repository and these lessons.
- Avoid repeated Gemini calls when deterministic checks already answer the question.
- Treat Gemini output as guidance that must still be verified by the runner's deterministic checks.
- If Gemini or another provider reports quota exhaustion, stop further AI calls for that batch rather than repeatedly retrying.
