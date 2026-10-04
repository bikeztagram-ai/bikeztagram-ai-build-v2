# Bikeztagram Music Engine

This is the production renderer boundary for Bikeztagram AI.

Architecture: Bikeztagram Music Director -> Song Brain -> Lyrics Director -> Bikeztagram Music Engine -> MiniMax Music 3.

The production web app no longer uses Hugging Face ZeroGPU for music generation. Hugging Face is not a runtime generation dependency and there is no shared free-tier GPU quota.

## No-quota generation

The renderer is self-hosted. A song request is limited by the GPU capacity we operate, not by a hosted free generation allowance.

MiniMax Music 3 natively generates complete songs up to about five minutes per render. Bikeztagram's full-song workflow is 180 seconds and the private engine supports up to 300 seconds. A future long-form compositor can join multiple musically planned renders for tracks longer than five minutes.

## Renderer

MiniMax Music 3 is served by SGLang-Omni. The official runtime supports single-GPU colocated serving or dual-GPU serving with the autoregressive and acoustic stages separated.

Example renderer command:

    CUDA_VISIBLE_DEVICES=0 sgl-omni serve --model-path /models/minimax-music3 --port 8000

Run the Bikeztagram gateway:

    cd music-engine
    python -m venv .venv
    . .venv/bin/activate
    pip install -r requirements.txt
    MINIMAX_SGLANG_URL=http://127.0.0.1:8000 uvicorn server:app --host 0.0.0.0 --port 8090

Set VITE_MUSIC_ENGINE_URL to the private HTTPS gateway. The browser talks to the Bikeztagram gateway; the SGLang port is never public.

## Production requirements

- Linux GPU host
- NVIDIA CUDA GPU suitable for the selected MiniMax Music 3 runtime
- persistent model storage
- HTTPS endpoint for the Bikeztagram gateway
- authentication and rate limiting before public launch
- MINIMAX_SGLANG_URL pointing at the local SGLang renderer

The Android/Termux environment is a development/control client, not the production GPU renderer.

## Pay-only-while-rendering lifecycle

The intended production lifecycle is **wake -> wait for GPU/model readiness -> render -> return WAV -> shut the GPU down**. The web app calls the server-side `/api/music-engine-wake` controller before generation. That controller calls the provider's configured wake endpoint without exposing provider credentials to the browser.

The gateway can then request provider shutdown after a successful render. Configure these on the GPU host:

    MUSIC_ENGINE_STOP_URL=https://provider.example/stop
    MUSIC_ENGINE_STOP_TOKEN=replace-with-provider-secret
    MUSIC_ENGINE_STOP_DELAY_SECONDS=2

The gateway serializes renders so two browser requests cannot race the automatic shutdown. A failed render does not trigger a provider shutdown until the active render state has been released. If no stop URL is configured, the engine remains running; this makes local development safe.

Configure the Vercel/server-side wake controller with:

    MUSIC_ENGINE_WAKE_URL=https://provider.example/start
    MUSIC_ENGINE_WAKE_TOKEN=replace-with-provider-secret

The provider-specific start/stop URLs are deliberately abstract. Once a GPU host is selected, only these environment variables need to be wired to its authorised API; the Music Studio and MiniMax renderer do not need to be redesigned.

## Security

Do not expose SGLang directly to the public internet. Protect the Bikeztagram gateway with an application secret and rate limits.

## Licence

MiniMax-Music3 has its own community licence. A commercial interface using the model must prominently display MiniMax-Music3, and hosted deployments have safeguards obligations. Ship the applicable licence/notice with production.

## Failure policy

There is no Hugging Face generation fallback. If our private renderer is offline, Bikeztagram reports that the Music Engine is unavailable rather than silently consuming another provider's quota.