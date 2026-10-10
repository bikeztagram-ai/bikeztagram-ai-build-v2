---
title: Bikeztagram AI Video Engine
emoji: 🏍️
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 5.49.0
python_version: "3.10"
app_file: app.py
pinned: false
license: apache-2.0
tags:
  - video-generation
  - text-to-video
  - image-to-video
  - wan
  - zero-gpu
---

# Bikeztagram AI Video Engine

A small public Gradio Space adapter for Bikeztagram AI, using the Apache-2.0 Wan2.2-TI2V-5B-Diffusers model. It exposes one stable API endpoint: `/generate_video`.

## Important constraints

- Intended for Hugging Face ZeroGPU. Free accounts have a small shared daily quota and queue; generation is for testing and short shots, not unlimited production.
- Clips are capped at 2–4 seconds. The GPU call has a 120-second ceiling; generation can still time out if the model or queue is slow.
- The pipeline is placed on ZeroGPU's CUDA-compatible device at startup, following current ZeroGPU guidance. CPU/GPU offload is intentionally not enabled.
- First launch downloads model weights and may take time.
- Do not enable paid hardware or paid credits if keeping the project at £0.
- A public Space is required for the browser integration below; do not place private tokens in frontend code.

## Account eligibility

Hugging Face currently allows eligible free personal accounts to host up to two ZeroGPU Spaces when the account is in good standing, the email is verified, and the account is over 30 days old. If Gradio is disabled or marked paid in the create screen, do not purchase a plan to continue this project. The account may not be eligible for the free ZeroGPU exception, so use an existing public demo for manual testing while we establish another free route.

## Bikeztagram integration

After this Space is created and its runtime is healthy, set the Vercel environment variable `HF_VIDEO_SPACE_URL` to its public runtime URL, for example `https://your-name-bikeztagram-video-engine.hf.space`. Optional: set `HF_VIDEO_API_NAME` to `/generate_video` (the default).

The endpoint inputs are: prompt text, optional image, duration (2/3/4), seed. Outputs are an MP4 video and a status string.

## Smoke-test checklist

1. Wait for the Space build to finish and confirm the status is Running.
2. Generate a 2-second shot first with a short prompt.
3. Repeat with a reference image.
4. Confirm the returned MP4 plays and can be downloaded.
5. Only then configure `HF_VIDEO_SPACE_URL` in Vercel and test the in-app provider.
