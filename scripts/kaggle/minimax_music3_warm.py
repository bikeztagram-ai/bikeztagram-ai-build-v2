import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

WORKER_API_URL = "WORKER_API_URL_PLACEHOLDER"
WORKER_TOKEN = "WORKER_TOKEN_PLACEHOLDER"
IDLE_SECONDS = 15 * 60
POLL_SECONDS = 10

print("=== BIKEZTAGRAM / MINIMAX MUSIC 3 WARM WORKER ===", flush=True)

def run(cmd, **kwargs):
    print("$", " ".join(cmd), flush=True)
    return subprocess.run(cmd, check=True, **kwargs)

def gpu_snapshot():
    try:
        return subprocess.check_output(
            ["nvidia-smi", "--query-gpu=index,name,memory.used,memory.total,utilization.gpu", "--format=csv,noheader"],
            text=True, timeout=10,
        ).strip()
    except Exception as exc:
        return f"nvidia-smi unavailable: {exc}"

def worker_call(action="next", payload=None):
    url = WORKER_API_URL + "?action=" + action
    headers = {
        "Accept": "application/json",
        "X-Music-Worker-Token": WORKER_TOKEN,
    }
    data = None
    method = "GET"
    if payload is not None:
        method = "POST"
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = Request(url, data=data, headers=headers, method=method)
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))

def update(job_id, status, progress, phase, error=None):
    payload = {
        "jobId": job_id,
        "status": status,
        "progress": progress,
        "phase": phase,
        "progressEstimated": status not in ("COMPLETED", "FAILED"),
    }
    if error:
        payload["error"] = error
    try:
        worker_call("status", payload)
    except Exception as exc:
        print("Status update failed:", exc, flush=True)

run([sys.executable, "-m", "pip", "install", "-q", "--no-input", "uv"])
run([sys.executable, "-m", "uv", "python", "install", "3.12"])

venv = "/kaggle/temp/music3-warm-venv"
run([sys.executable, "-m", "uv", "venv", venv, "--python", "3.12"])
py = f"{venv}/bin/python"

run([
    sys.executable, "-m", "uv", "pip", "install", "--python", py,
    "git+https://github.com/huggingface/diffusers.git",
    "transformers", "accelerate", "safetensors", "soundfile",
])

os.makedirs("/kaggle/temp/huggingface/hub", exist_ok=True)
os.environ["HF_HOME"] = "/kaggle/temp/huggingface"
os.environ["HF_HUB_CACHE"] = "/kaggle/temp/huggingface/hub"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

print("=== GPU PRE-FLIGHT ===", flush=True)
print(gpu_snapshot(), flush=True)

import torch
from diffusers import ComponentsManager, ModularPipeline
from diffusers.hooks import apply_group_offloading

manager = ComponentsManager()
manager.enable_auto_cpu_offload(device="cuda")

print("Loading MiniMax Music 3 pipeline once...", flush=True)
pipe = ModularPipeline.from_pretrained(
    "MiniMaxAI/MiniMax-Music3",
    components_manager=manager,
)
pipe.load_components(dtype=torch.float16)
apply_group_offloading(
    pipe.language_model,
    onload_device=torch.device("cuda"),
    offload_type="leaf_level",
    use_stream=True,
    low_cpu_mem_usage=True,
)
print("=== MUSIC 3 READY / WARM ===", flush=True)

last_activity = time.time()

try:
    while time.time() - last_activity < IDLE_SECONDS:
        try:
            response = worker_call("next")
        except (HTTPError, URLError, TimeoutError, Exception) as exc:
            print("Worker poll error:", exc, flush=True)
            time.sleep(POLL_SECONDS)
            continue

        job = response.get("job")
        if not job:
            time.sleep(POLL_SECONDS)
            continue

        last_activity = time.time()
        job_id = str(job.get("jobId") or "").strip()
        prompt = str(job.get("prompt") or "").strip()
        lyrics = str(job.get("lyrics") or "").strip()
        duration = max(5.0, min(300.0, float(job.get("duration") or 30)))
        force_instrumental = str(job.get("force_instrumental") or "false").lower() == "true"
        output_put_url = str(job.get("output_put_url") or "").strip()

        try:
            if force_instrumental:
                lyrics = ""
            elif not lyrics:
                raise ValueError("Music Studio supplied no lyrics. MiniMax Music 3 requires non-empty lyrics for vocal generation.")
            if not prompt:
                prompt = "Genre: cinematic electronic rock. BPM: 105. Key: D minor. Deep punchy drums, pulsing bass, distorted electric guitar, atmospheric synths, dramatic build and a huge energetic chorus. Polished modern production."
            if not output_put_url:
                raise ValueError("Missing signed Blob output URL.")

            update(job_id, "IN_PROGRESS", 20, "Rendering — warm MiniMax Music 3 worker is generating the song")
            render_started = time.time()
            audio = pipe(
                prompt=prompt,
                lyrics=lyrics,
                audio_duration=duration,
                generator=torch.Generator("cuda").manual_seed(int(time.time()) % 2147483647),
                output="audios",
            )[0]

            import soundfile as sf
            import numpy as np
            out = f"/kaggle/working/bikeztagram_minimax_music3_{job_id}.wav"
            audio_np = np.asarray(audio)
            if audio_np.ndim == 2:
                audio_np = audio_np.T
            audio_np = audio_np.astype(np.float32, copy=False)
            sf.write(out, audio_np, pipe.sampling_rate)

            update(job_id, "FINALISING", 95, "Finalising — uploading the finished WAV")
            with open(out, "rb") as fh:
                upload_request = Request(
                    output_put_url,
                    data=fh.read(),
                    headers={"Content-Type": "audio/wav"},
                    method="PUT",
                )
                with urlopen(upload_request, timeout=180) as upload_response:
                    if upload_response.status < 200 or upload_response.status >= 300:
                        raise RuntimeError(f"Blob upload returned HTTP {upload_response.status}")

            update(job_id, "COMPLETED", 100, "Complete — your song is ready")
            print(f"JOB_COMPLETE={job_id} RENDER_SECONDS={time.time() - render_started:.1f}", flush=True)
            try:
                os.remove(out)
            except OSError:
                pass
        except Exception as exc:
            print(f"JOB_FAILED={job_id}: {exc}", flush=True)
            update(job_id, "FAILED", 100, "Generation failed", str(exc))

        last_activity = time.time()

finally:
    print("=== WARM WORKER IDLE TIME REACHED — SHUTTING DOWN ===", flush=True)
    try:
        torch.cuda.empty_cache()
    except Exception:
        pass
