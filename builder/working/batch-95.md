# batch-95

## Objective
Harden the Android/PWA delivery experience without redesigning the editor. Improve installability, manifest correctness, icons, viewport/mobile-safe behaviour, offline app-shell resilience and safe cache/version handling. Ensure the deployed app remains usable on Android browsers and can be added to the home screen reliably. Restrict changes to PWA/static delivery infrastructure and mobile-safe styling utilities where possible; do not modify the AI Director, timeline logic, renderer, .github/workflows/**, builder infrastructure or durable queue. Prove production build and installability-related contracts with check-fix-continue.

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
