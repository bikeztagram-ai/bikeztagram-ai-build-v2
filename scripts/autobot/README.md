# AutoBot Engineering Loop

The V3 builder uses a local strategic brain followed by deterministic execution.

- Strategic planner: decides whether the existing roadmap is exhausted and, only then, selects a bounded improvement.
- Deterministic executor: implements declared tasks and verifies them.
- Quality feedback: turns failures and no-op work into explicit evidence.
- PR gate: refuses checkpoints with failures or zero new production work.

The system is intentionally provider-independent and does not require Gemini or any external AI service.
