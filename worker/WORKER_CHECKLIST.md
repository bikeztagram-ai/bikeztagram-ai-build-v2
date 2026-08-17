# Bikeztagram zero-cost GPU worker checklist

This is the remaining bridge between the web application and real open-source video generation.

## Required

- NVIDIA GPU with enough VRAM for the selected model.
- Python environment with the worker requirements installed.
- `BIKEZ_WORKER_TOKEN` set to a private random value.
- Worker reachable by the Bikeztagram server over HTTPS when used remotely.
- Wan2.1 T2V-1.3B weights available to the worker.

## Health gate

`GET /health` must report:

- `ok: true`
- `engine: Wan2.1-T2V-1.3B`
- `mode: text-to-video`
- `zeroCostOnly: true`
- `gpuRequired: true`

## Generation gate

`POST /generate` with the worker token and a short prompt must return an MP4. The first validation target is 1–5 seconds at 832x480.

## Important £0 rule

The application must never silently switch to a paid provider when the worker is unavailable. A missing worker should produce a clear `worker unavailable` state and allow the job to be retried later.

## Quality progression

1. Prove one real generated MP4.
2. Add deterministic seeds and repeatability checks.
3. Add prompt expansion / shot planning.
4. Add image-to-video and reference-image paths where the selected open model supports them.
5. Add automatic output QA and retry decisions.
6. Add multi-shot generation and stitching.
