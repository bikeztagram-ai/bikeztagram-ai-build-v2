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

1. Create a Gradio Space and enable ZeroGPU if the account is eligible.
2. Copy `app.py` and `requirements.txt` from this directory into the Space.
3. Wait for the Space to become Running.
4. Generate a 1–5 second test clip from a simple prompt.
5. Confirm the returned file is a non-empty MP4 and can be played.
6. Only after that proof should the Bikeztagram app be given the worker URL/token.

## Acceptance test

The first end-to-end milestone is:

`prompt -> ZeroGPU -> Wan2.1 -> real MP4 -> Bikeztagram -> playback/QA`

If ZeroGPU is unavailable or its free quota is exhausted, the system must report the worker as unavailable. It must never silently switch to a paid video provider.
