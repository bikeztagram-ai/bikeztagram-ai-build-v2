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

- Intended for Hugging Face ZeroGPU. Free usage currently has a small daily quota and shared queue; it is not unlimited hosting.
- Clips are capped at 2–4 seconds and use a low step count to improve the chance of fitting the GPU runtime.
- First launch downloads model weights and may take time.
- Do not enable paid hardware or paid credits if keeping the project at £0.
- The Space must be public for the browser integration below; do not place private tokens in frontend code.

## Bikeztagram integration

After this Space is running, set the Vercel environment variable `HF_VIDEO_SPACE_URL` to its public runtime URL, for example `https://your-name-bikeztagram-video-engine.hf.space`. Optional: set `HF_VIDEO_API_NAME` to `/generate_video` (the default).

The endpoint inputs are: prompt text, optional image, duration (2/3/4), seed. Outputs are an MP4 video and a status string.
