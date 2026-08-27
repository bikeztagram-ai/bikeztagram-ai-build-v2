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
- Treat every acceptance item as a behavioural requirement. Do not mark an objective complete because an approximation, helper, schema, or test exists if the requested user-visible behaviour is still incomplete.
- Use the words in the objective precisely. If the objective says atomic, recovery, seamless, reliable, integrated, truthful, or end-to-end, implement and verify the actual behaviour those words imply rather than the easiest technical approximation.
- Separate implementation evidence from test evidence. A test can prove a function works; it cannot by itself prove that the real application lifecycle, renderer, editor, or export path works.
- When a batch changes state, persistence, media, rendering, provider calls, or recovery, verify at least one realistic lifecycle that crosses the relevant boundaries.
- When a provider or remote dependency fails, prefer bounded, observable recovery with a clear terminal state over indefinite retrying or a misleading green status.
- A batch that is technically useful but incomplete should remain reviewable and explicitly document the remaining gap; never conceal a limitation to make the batch appear complete.

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

### Batch 98: real project persistence and recovery
- Persistence must be judged by the real App lifecycle, not by the existence of a persistence utility or unit tests.
- Do not call persistence atomic merely because a primary key and backup key exist. If true atomicity is not possible in the browser storage mechanism, describe the guarantee accurately and implement the strongest recoverable last-known-good behaviour available.
- Persist only resumable metadata and stable references; never put browser File objects or large media blobs into synchronous project storage.
- On reload, the application must restore usable project state into the actual editor and clearly distinguish restored metadata from media that must be re-selected or revalidated.
- Missing-media recovery is a user workflow: the user must have a clear path to reconnect assets and continue editing without losing the recovered project state.
- Persistence tests should cover save/load, reload-after-edit, schema migration, corruption/partial state, missing media and continued editing. Unit tests alone are insufficient evidence of a successful recovery lifecycle.
- When a batch exposes a semantic gap such as "atomic" versus "last-known-good", future objectives and prompts must use explicit acceptance behaviour rather than relying on ambiguous architectural terminology.

## How Gemini should be used

- Use Gemini as a bounded architecture/quality advisor, not as an unlimited second builder.
- One focused architecture-quality pass per batch is preferred before execution so the builder receives an implementation-ready brief grounded in the current repository and these lessons.
- The architecture pass should identify the relevant production path, existing contracts to preserve, concrete acceptance evidence, likely failure modes and the smallest coherent implementation boundary before coding.
- Avoid repeated Gemini calls when deterministic checks already answer the question.
- Treat Gemini output as guidance that must still be verified by the runner's deterministic checks.
- If Gemini or another provider reports quota exhaustion, stop further AI calls for that batch rather than repeatedly retrying.
- If a model times out or a transient provider error occurs, use bounded fallback/retry behaviour only when the error is classified as transient. Never loop indefinitely or switch models repeatedly without a terminal rule.

## Batch completion checklist

Before declaring a batch verified, the builder should be able to answer YES to all applicable questions:

1. Did I inspect the current implementation and relevant contracts before editing?
2. Did I change the real production path rather than only adding tests or documentation?
3. Does the implementation satisfy every acceptance item, not just the headline objective?
4. Did I test the user-visible behaviour or a representative end-to-end lifecycle where practical?
5. Did I run the build and all relevant existing verification commands?
6. Did I run check-fix-check-continue after the first verification result?
7. Did I preserve working paths and protected contracts?
8. Are provider failures, missing media and unsupported paths truthful and recoverable rather than silently fabricated?
9. Did I avoid unrelated roadmap work and unnecessary refactors?
10. Can a human reviewer understand what changed, what was verified, and any remaining limitation from the PR/checkpoint?
