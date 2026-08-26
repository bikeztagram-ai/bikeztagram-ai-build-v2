# batch-94

## Objective
Improve the production export/delivery layer for finished creator videos. Support reliable social-safe output profiles, aspect-ratio handling, deterministic filenames/metadata, audio/video duration agreement, export validation, progress/error states and graceful recovery from failed or unsupported export paths. Preserve browser/FFmpeg rendering and do not regress existing successful MP4 output. Restrict work to export/delivery utilities and their existing verification boundaries; do not modify .github/workflows/**, builder infrastructure, the AI Director/timeline implementation, or the durable queue. Make real production-code improvements and verify actual output contracts with representative 9:16, 1:1 and 16:9 cases.

## Provider
OpenAI Codex (gpt-5.6-terra).

## Resume mode
Starting a new builder branch.

## Status
Started.

## Working rule
Execute the supplied objective; do not invent roadmap work.
