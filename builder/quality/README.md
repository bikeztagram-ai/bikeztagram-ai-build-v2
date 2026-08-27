# AutoBot quality gates

A build is reviewable only after the gates can prove the requested change.

1. **Scope** — changed files remain inside the declared task scope and protected infrastructure is untouched.
2. **Regression** — the configured repository verification suite passes.
3. **Acceptance** — every declared acceptance criterion has explicit passing evidence.
4. **Merge readiness** — the checkpoint is complete, evidence exists, and protected infrastructure has not been changed.

Gates are fail-closed. A failed gate blocks review readiness and must result in repair, a new checkpoint, or an explicit human decision.

These gates do not merge or deploy. GitHub branch protection and human review remain the final authority.
