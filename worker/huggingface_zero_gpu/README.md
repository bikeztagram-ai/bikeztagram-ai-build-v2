# Bikeztagram ZeroGPU proof worker

This adapter is intended for a Hugging Face Space using ZeroGPU. Hugging Face currently provides ZeroGPU access to free users with a daily included quota; free personal accounts can host up to two ZeroGPU Spaces when the account is eligible. See the official ZeroGPU documentation before enabling the Space.

## Purpose

- prove a real prompt-to-video generation without buying GPU time;
- use the same Wan2.1 T2V-1.3B family as the local worker;
- keep the first proof short: 1–5 seconds at 832x480;
- never fall back to a paid provider.

## Important

ZeroGPU is shared/queued infrastructure with a daily quota. It is therefore a **proof and development worker**, not a promise of unlimited production capacity. If the free quota is exhausted, the app must report the worker as unavailable rather than charge the user.

## Space setup

Create a Gradio Space, enable ZeroGPU if the account is eligible, and copy `app.py` into the Space. Install the dependencies required by the Wan2.1/Diffusers runtime. The application exposes a simple Gradio generation UI for the first end-to-end proof.
