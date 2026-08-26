# batch-96

## Objective
Make the product resilient when Gemini, remote APIs, media decoding, or other optional providers fail, time out or return malformed data. Strengthen the shared request/error handling and truthful fallback paths so users receive actionable state instead of hangs, silent failures or fabricated results. Preserve local-first operation and existing successful paths. Restrict changes to shared request/error/recovery infrastructure and its existing consumers; do not modify the AI Director/timeline implementation, renderer, .github/workflows/**, builder infrastructure or durable queue. Make substantive production changes and verify timeout, malformed-response and offline/provider-unavailable scenarios.

## Required durable context
- builder/quality/project-memory.md
- builder/quality/lessons.md
- config/autonomous-builder-queue.json

## Provider
OpenAI Codex (gpt-5.6-terra).

## Resume mode
Starting a new builder branch.

## Status
Started.
