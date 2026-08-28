# AutoBot Brain

Bikeztagram's AutoBot is intentionally Gemini-free and provider-independent.

The brain is a deterministic strategic layer that uses durable project memory, roadmap state, run evidence, no-op/failure telemetry and bounded rules to choose the next engineering objective when the normal roadmap is exhausted.

## Loop

1. Inspect durable state.
2. Preserve queued roadmap work.
3. Detect failures, no-op work and backlog exhaustion.
4. Select a bounded high-value improvement from the local strategy catalogue.
5. Add an auditable generated objective and task.
6. Let the deterministic executor implement and verify it.
7. Produce quality-feedback and PR-gate evidence.

No external AI provider is required. This keeps the builder predictable, cheap and resilient while giving it autonomous planning behaviour.
