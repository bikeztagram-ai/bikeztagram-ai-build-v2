# AutoBot Repair Bot role

The Repair Bot is a downstream product-code repair worker. It does not self-evolve, repair AutoBot infrastructure, or modify fleet control files.

## Intended flow

Builder candidate -> failure evidence -> Repair Bot -> QA -> Reviewer -> verified candidate.

The Repair Bot must receive the Builder's actual candidate state/diff, not merely an error message against `main`. It must diagnose the concrete root cause, repair only the declared product scope, run focused verification, and preserve the candidate's intended work.

Infrastructure problems are an operator-maintained concern. They must be recorded and surfaced rather than delegated to the Repair Bot.

A repair is useful only when it improves the Builder candidate toward its original product objective. A syntax/build pass alone is insufficient.
