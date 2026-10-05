# Bikeztagram Music Engine

Private MiniMax Music 3 renderer for Bikeztagram AI.

## Zero-cost testing architecture

Music Studio → Vercel `/api/music-engine` → GitHub Actions → Kaggle free GPU → MiniMax Music 3 (Diffusers) → signed Vercel Blob upload → Music Studio.

This is the testing architecture. It deliberately does **not** use RunPod, paid GPU hosting, or Hugging Face hosted inference.

Kaggle's CLI can push a private kernel, request the T4×2 accelerator, monitor the run, and download its output. The production worker deliberately uses the proven low-VRAM T4 route: GPU 0 plus CPU/layer offload. The second T4 is left unused because the earlier dual-GPU SGLang topology did not pool VRAM correctly.

## Lifecycle

1. Music Studio submits the prompt, lyrics and song settings to `/api/music-engine`.
2. Vercel creates a short-lived, path-scoped Blob PUT URL.
3. Vercel dispatches the GitHub Actions workflow using a server-side GitHub Actions token.
4. GitHub Actions creates a unique private Kaggle kernel for that job.
5. Kaggle runs MiniMax Music 3 locally from its model weights.
6. The workflow downloads the WAV from Kaggle.
7. The workflow uploads the WAV directly to the signed Blob URL.
8. Music Studio polls the job and receives a signed GET URL.
9. The temporary Kaggle kernel is deleted.

The GPU is therefore only requested when a song is generated. There is no permanently running GPU worker.

## Vercel configuration

The only additional server-side credential required for automatic production dispatch is:

    GITHUB_ACTIONS_TOKEN=...

It is a GitHub credential, not a paid service. The token must be able to dispatch workflows in this repository and read workflow runs.

Existing Vercel Blob authentication is used by the Vercel function to mint scoped upload/download URLs. The Blob credential is never sent to the browser or stored in GitHub.

The existing Kaggle GitHub secrets remain:

    KAGGLE_USERNAME=...
    KAGGLE_API_TOKEN=...

## Generation limits

The application currently accepts up to 300 seconds per render. That is a product/testing ceiling chosen around the MiniMax renderer and free-GPU workflow, not a paid-provider restriction. Kaggle availability/quota remains the real free-compute constraint.

There is deliberately no Hugging Face hosted-generation fallback.

## Future production upgrade

When the project is proven and the user decides spending money is worthwhile, the GPU boundary can be replaced with a faster persistent or on-demand paid GPU while keeping the same Music Engine contract. The Music Studio does not need to be redesigned.
