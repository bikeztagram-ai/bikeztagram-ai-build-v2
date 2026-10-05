# Bikeztagram Music Engine

Private MiniMax Music 3 renderer for Bikeztagram AI.

## Production path

Music Studio → Vercel /api/music-engine → RunPod Serverless → MiniMax Music 3 (Diffusers) → Vercel Blob → Music Studio.

RunPod is the GPU boundary. It scales workers from zero, so there is no permanently running GPU worker. Compute is billed only while the worker is active. The first production target is a 24 GB Serverless GPU class.

The model weights are not hosted inference. The worker runs the open MiniMax Music 3 weights itself. A RunPod model cache or persistent network volume should be attached so the 57 GB model repository is not downloaded on every cold start.

## RunPod worker

Dockerfile.runpod builds the worker from a RunPod PyTorch CUDA image. runpod_renderer.py loads MiniMax Music 3 lazily, applies automatic CPU offload plus leaf-level streaming language-model offload, renders the requested song, then uploads the full-quality WAV directly to a Vercel Blob signed PUT URL supplied by the Vercel gateway.

Build for RunPod's x86_64 workers:

    docker build --platform linux/amd64 -f music-engine/Dockerfile.runpod -t YOUR_REGISTRY/bikeztagram-minimax-music3:v1 .
    docker push YOUR_REGISTRY/bikeztagram-minimax-music3:v1

Create a RunPod Serverless endpoint from that image with minimum workers = 0. Use a 24 GB GPU class for the first production test. Do not set a permanent minimum worker: that would create an idle GPU bill.

Attach persistent model storage / RunPod cached-model support and set the worker cache to /runpod-volume/huggingface. The first cold start may be dominated by model initialization; later workers should reuse the cached weights.

## Vercel environment

Set these server-side variables on the Bikeztagram Vercel project:

    RUNPOD_API_KEY=...
    RUNPOD_ENDPOINT_ID=...

VITE_MUSIC_ENGINE_URL is optional. Without it the Music Studio defaults to /api/music-engine.

The Vercel gateway never exposes the RunPod API key to the browser. It creates a short-lived signed Blob PUT URL, submits the GPU job, polls its status, then creates a signed GET URL for the generated WAV.

## Lifecycle

1. User presses CREATE SONG.
2. Vercel creates a scoped Blob upload URL.
3. RunPod queues the job and automatically starts a GPU worker if none is active.
4. MiniMax Music 3 generates the track.
5. The worker uploads the lossless WAV directly to Blob.
6. The worker exits / scales to zero when idle.
7. Music Studio receives a temporary signed audio URL and plays the track.

There is deliberately no Hugging Face hosted-generation fallback.

## Local renderer

For a local GPU, the same runpod_renderer.py can be imported by music-engine/server.py and served through FastAPI. This is useful for debugging and private development, but the production deployment target is RunPod Serverless.

## Quality / limits

The current production request ceiling is 180 seconds so full-song generation stays inside the first Vercel/RunPod integration envelope. MiniMax Music 3 itself supports longer renders; a later long-form compositor can stitch multiple planned renders when the product needs tracks beyond this envelope.
