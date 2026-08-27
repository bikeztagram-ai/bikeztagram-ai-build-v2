# Memory preflight correction

The deterministic AutoBot executor is now the authoritative long-run runner. Persistent-memory verification must inspect that executor rather than the legacy task-driven provider runner.
