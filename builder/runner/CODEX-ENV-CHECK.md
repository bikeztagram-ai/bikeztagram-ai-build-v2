# Codex environment check

The workflow must expose `OPENAI_API_KEY` to the sustained builder jobs. The runner passes it to `long-run-executor.mjs`, which passes it to `ai-long-run.mjs` and the Codex CLI.

A missing key is a configuration failure, not a successful no-op.