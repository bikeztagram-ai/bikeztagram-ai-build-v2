# AutoBot Open-Source Acceleration

This document records reusable architecture patterns evaluated from permissively licensed autonomous coding projects. We implement patterns, not proprietary code.

## Adopted patterns

### Issue/task -> implementation -> gate -> PR
Inspired by Aixgo Code (Apache-2.0): an autonomous agent should treat the repository's own quality gate as the definition of done, then hand the result to human-controlled review. The AutoBot keeps merge/deploy authority outside the model.

### Persistent execution and bounded retries
Inspired by autonomous coding-agent workflows such as OpenHands and CodeBot AI: preserve state across runs, retry bounded failures, and stop rather than falsely reporting success.

### Auditability
Inspired by CodeBot AI's hash-chained audit approach: every autonomous run should leave durable evidence of objective selection, attempts, verification, failures and reset behaviour. AutoBot's existing checkpoint/state artifacts are the first layer; future batches should add immutable run summaries and integrity hashes.

### Provider-neutral local execution
Keep the implementation engine independent of a single model vendor. Local Ollama remains the default AutoBot implementation path. Never add Gemini.

## Licence rule

Only reuse source code when its licence is compatible with this repository and the exact component is actually needed. Prefer implementing the underlying pattern independently when that is smaller, safer, or avoids licence/maintenance coupling.

## Next acceleration targets

1. Run-level tamper-evident audit records.
2. Objective dependency graph rather than a flat queue.
3. Failure classification and targeted retry prompts.
4. Parallel independent verification where safe.
5. Automatic stale-branch/PR health checks.
6. Evidence-driven progress metrics.
