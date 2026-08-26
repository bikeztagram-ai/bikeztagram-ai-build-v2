# batch-93

## Objective
Strengthen the production media-ingestion layer for real creator workloads. Handle large mixed photo/video batches, orientation and metadata normalization, duration/dimension/codec profiling, corrupt or unsupported media, duplicate detection, stable asset identifiers and deterministic ordering without losing useful metadata. Keep ingestion local-first and resilient, avoid blocking the creative pipeline on one bad asset, and expose truthful fallback states. Make substantive production changes in the media-intake/profiling layer only; do not modify .github/workflows/**, builder infrastructure, the AI Director/timeline implementation, or the durable queue. Prove behaviour with representative mixed motorcycle media and failure cases using check-fix-check-continue.

## Provider
OpenAI Codex (gpt-5.6-terra).

## Resume mode
Starting a new builder branch.

## Status
Started.

## Working rule
Execute the supplied objective; do not invent roadmap work.
