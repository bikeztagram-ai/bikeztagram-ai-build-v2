import os
import re
import signal
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

print("=== BIKEZTAGRAM / MINIMAX MUSIC 3 BATCH ===", flush=True)

def run(cmd, **kwargs):
    print("$", " ".join(cmd), flush=True)
    return subprocess.run(cmd, check=True, **kwargs)

def gpu_snapshot():
    try:
        return subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.used,memory.total,utilization.gpu",
                "--format=csv,noheader",
            ],
            text=True,
            timeout=10,
        ).strip()
    except Exception as exc:
        return f"nvidia-smi unavailable: {exc}"

def tail_server_log(log_path, stop_event):
    seen = 0
    while not stop_event.wait(10):
        try:
            lines = Path(log_path).read_text(errors="replace").splitlines()
            if len(lines) > seen:
                new_lines = lines[seen:]
                seen = len(lines)
                for line in new_lines[-40:]:
                    print(f"[MUSIC3] {line}", flush=True)
        except Exception as exc:
            print(f"[MUSIC3] log monitor error: {exc}", flush=True)

run([sys.executable, "-m", "pip", "install", "-q", "--no-input", "uv"])
run([sys.executable, "-m", "uv", "python", "install", "3.12"])

venv = "/kaggle/temp/music3-venv"
if os.path.exists(venv):
    print("Removing stale virtual environment...", flush=True)
    shutil.rmtree(venv, ignore_errors=True)

run([sys.executable, "-m", "uv", "venv", venv, "--python", "3.12"])
py = f"{venv}/bin/python"
sgl = f"{venv}/bin/sgl-omni"

run([
    sys.executable, "-m", "uv", "pip", "install",
    "--python", py, "--prerelease=allow", "sglang-omni==0.1.7"
])
if not os.path.exists(sgl):
    raise RuntimeError("sgl-omni installation failed")

gpus = gpu_snapshot()
print("=== GPU PRE-FLIGHT ===", flush=True)
print(gpus, flush=True)
gpu_count = len([x for x in gpus.splitlines() if x.strip()])
if gpu_count < 2:
    raise RuntimeError("MiniMax Music 3 requires T4 x2 for this test.")

os.makedirs("/kaggle/temp/huggingface/hub", exist_ok=True)
os.environ["HF_HOME"] = "/kaggle/temp/huggingface"
os.environ["HF_HUB_CACHE"] = "/kaggle/temp/huggingface/hub"

log_path = "/kaggle/temp/music3_batch.log"
log = open(log_path, "w", buffering=1)

print("=== STARTING MINIMAX MUSIC 3 ===", flush=True)
print("Model: MiniMaxAI/MiniMax-Music3", flush=True)
print("GPUs: 0,1 (T4 x2)", flush=True)
print("HF cache: /kaggle/temp/huggingface", flush=True)
print("Startup timeout: 45 minutes", flush=True)

started = time.time()
p = subprocess.Popen(
    [
        "bash", "-lc",
        f"CUDA_VISIBLE_DEVICES=0,1 {sgl} serve "
        "--model-path MiniMaxAI/MiniMax-Music3 --port 8000"
    ],
    stdout=log,
    stderr=subprocess.STDOUT,
    start_new_session=True,
    env=os.environ.copy(),
)

monitor_stop = threading.Event()
monitor = threading.Thread(target=tail_server_log, args=(log_path, monitor_stop), daemon=True)
monitor.start()

ready = False
try:
    for i in range(540):
        elapsed = i * 5
        r = subprocess.run(
            ["curl", "-s", "-m", "5", "http://127.0.0.1:8000/v1/models"],
            capture_output=True,
            text=True,
        )

        if r.returncode == 0 and r.stdout:
            ready = True
            print(f"=== SERVER READY after {elapsed}s ===", flush=True)
            print(r.stdout[:2000], flush=True)
            break

        if p.poll() is not None:
            raise RuntimeError(
                "Music 3 server exited during startup.\n"
                + Path(log_path).read_text(errors="replace")[-30000:]
            )

        if i % 6 == 0:
            print(
                f"STARTUP HEARTBEAT: {elapsed}s elapsed | "
                f"GPU status: {gpu_snapshot()}",
                flush=True,
            )

        time.sleep(5)

    if not ready:
        raise RuntimeError(
            "Music 3 server did not become ready within 45 minutes.\n"
            + Path(log_path).read_text(errors="replace")[-30000:]
        )

    import requests

    lyrics = """[Verse]
Neon cuts across the road
Engine singing through the night
City fading in the mirrors
Chasing every line of light

[Chorus]
Ride into the open dark
Chase the road and chase the light
No turning back, the engine calls
We own the road tonight"""

    instructions = (
        "Cinematic electronic rock motorcycle soundtrack, 105 BPM, D minor, "
        "deep punchy drums, pulsing bass, distorted electric guitar, "
        "atmospheric synths, dramatic build and a huge energetic chorus, "
        "polished modern production."
    )

    payload = {
        "model": "MiniMaxAI/MiniMax-Music3",
        "input": lyrics,
        "instructions": instructions,
        "seed": 1001,
        "max_new_tokens": 750,
    }

    print("=== RENDER START ===", flush=True)
    print("Target: real 30-second Music 3 test", flush=True)
    print(f"GPU status before render: {gpu_snapshot()}", flush=True)

    render_started = time.time()
    resp = requests.post(
        "http://127.0.0.1:8000/v1/audio/speech",
        json=payload,
        timeout=1800,
    )
    resp.raise_for_status()

    out = "/kaggle/working/bikeztagram_minimax_music3_test.wav"
    Path(out).write_bytes(resp.content)

    render_seconds = time.time() - render_started
    total_seconds = time.time() - started

    print(f"=== RENDER COMPLETE ===", flush=True)
    print(f"RENDER_SECONDS={render_seconds:.1f}", flush=True)
    print(f"TOTAL_SECONDS={total_seconds:.1f}", flush=True)
    print(f"DONE={out}", flush=True)
    print(f"BYTES={len(resp.content)}", flush=True)
    print(f"GPU status after render: {gpu_snapshot()}", flush=True)

finally:
    monitor_stop.set()
    print("=== SHUTTING DOWN MUSIC 3 ENGINE ===", flush=True)
    try:
        os.killpg(os.getpgid(p.pid), signal.SIGTERM)
        time.sleep(3)
    except Exception as exc:
        print("TERM:", exc, flush=True)

    if p.poll() is None:
        try:
            os.killpg(os.getpgid(p.pid), signal.SIGKILL)
        except Exception:
            pass

    monitor.join(timeout=2)
    log.close()
    print("ENGINE_SHUTDOWN=TRUE", flush=True)
