# Codex launch contract

The sustained builder must pass `OPENAI_API_KEY` from the GitHub Actions secret into `long-run-executor.mjs` and its child `ai-long-run.mjs` process.

The deterministic executor is allowed to finish quickly, but a successful long-duration run must then invoke the OpenAI Codex engineering layer with the remaining duration budget. If the key is unavailable, the run must fail loudly rather than silently report success.

Gemini and Google model APIs are forbidden.