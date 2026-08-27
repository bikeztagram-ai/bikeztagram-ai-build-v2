# AutoBot self-improvement policy

AutoBot may learn from durable evidence, but it must improve itself through reviewable, bounded changes.

## Learning loop

1. Record every unit's implementation, verification, outcome and failure reason.
2. Classify recurring failures by stable category.
3. Require a pattern to recur before treating it as a builder-system problem.
4. Generate a concrete improvement proposal with expected benefit and regression risks.
5. Implement the proposal only in an isolated self-improvement branch.
6. Run the complete builder verification suite plus targeted regression checks.
7. Produce a review package containing before/after behaviour and evidence.
8. Never auto-merge a change to the builder itself.

## Allowed self-improvements

- task ordering and dependency metadata
- task acceptance criteria
- deterministic verification rules
- diagnostics and error classification
- checkpoint/evidence quality
- recovery strategies that preserve safety
- efficiency improvements that do not reduce verification
- documentation and durable lessons

## Human-review-only changes

- GitHub permissions or tokens
- workflow security and protected paths
- automatic merge/deploy behaviour
- secret handling
- branch protection bypasses
- the self-improvement policy itself
- any change that weakens a quality gate

## Learning quality rule

A lesson is not considered learned because it was written to a file. A lesson becomes active only when a deterministic regression test or explicit verification rule demonstrates that the builder now behaves differently in the intended way.

## Anti-feedback-loop rule

A self-improvement must not count its own output as evidence of its success. Verification must exercise behaviour independently of the code path being changed where practical.
