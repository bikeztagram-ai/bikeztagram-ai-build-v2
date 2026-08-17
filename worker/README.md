# Bikeztagram zero-cost AI video worker

This worker is the missing GPU-side generation engine for Bikeztagram. It runs
Wan2.1 T2V-1.3B on a GPU machine and exposes a tiny authenticated HTTP API.

## What it does

`POST /generate` accepts a creative prompt and returns a newly generated MP4.
There is deliberately **no paid API fallback** in this worker.

Wan2.1 T2V-1.3B is used as the first compatibility target because the upstream
project documents it as a consumer-GPU text-to-video model and recommends
`832*480`, CPU T5, model offload, sample shift 8 and guidance 6 for constrained
single-GPU runs.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export BIKEZ_WORKER_TOKEN='choose-a-long-random-token'
uvicorn worker.wan21_worker:app --host 0.0.0.0 --port 7860
```

The first generation downloads the Wan2.1 source and the 1.3B checkpoint. Keep
those cached on the worker so later jobs do not redownload them.

## API

Health:

```bash
curl http://localhost:7860/health
```

Generation:

```bash
curl -X POST http://localhost:7860/generate \
  -H 'Content-Type: application/json' \
  -H "X-Bikeztagram-Token: $BIKEZ_WORKER_TOKEN" \
  -d '{"prompt":"A photorealistic cinematic motorcycle ride through a wet London street at night, low tracking camera, realistic headlights and reflections","seconds":5,"width":832,"height":480}' \
  --output result.mp4
```

## Zero-cost boundary

The worker does not contain billing credentials and does not call a paid video
API. Free notebook GPU sessions can be used for experiments, while a future
user-owned GPU machine can run the same worker continuously.
