import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

print("=== BIKEZTAGRAM / MINIMAX MUSIC 3 SGLANG DUAL-T4 ===", flush=True)

def run(cmd, **kwargs):
    print("$", " ".join(map(str, cmd)), flush=True)
    return subprocess.run(cmd, check=True, **kwargs)

request = dict(globals().get("EMBEDDED_REQUEST") or {})
for candidate in (Path.cwd() / "music_request.json", Path("/kaggle/working/music_request.json")):
    if candidate.exists():
        request = json.loads(candidate.read_text(encoding="utf-8"))
        break

job_id = str(request.get("job_id") or "local-test")
lyrics = str(request.get("lyrics") or "").strip()
prompt = str(request.get("prompt") or "").strip()
duration = max(5.0, min(300.0, float(request.get("duration") or 30)))
force_instrumental = bool(request.get("forceInstrumental"))

if force_instrumental:
    lyrics = "[Intro]\n(instrumental)\n[Outro]\n(instrumental)"
elif not lyrics:
    raise ValueError("MiniMax Music 3 requires non-empty lyrics.")

if not prompt:
    prompt = "Genre: cinematic electronic rock. BPM: 105. Key: D minor. Deep punchy drums, pulsing bass, distorted electric guitar, atmospheric synths, dramatic build and a huge energetic chorus."

print(f"JOB_ID={job_id}", flush=True)
print(f"DURATION={duration}", flush=True)
print(f"REQUEST_HAS_LYRICS={bool(lyrics)}", flush=True)

print("=== INSTALLING OFFICIAL SGLANG-OMNI RUNTIME (PYTHON 3.12) ===", flush=True)
run([sys.executable, "-m", "pip", "install", "-q", "--no-input", "uv"])
venv = "/kaggle/temp/music3-sglang-venv"
run([sys.executable, "-m", "uv", "venv", venv, "--python", "3.12"])
py = f"{venv}/bin/python"
sgl = f"{venv}/bin/sgl-omni"
run([
    sys.executable, "-m", "uv", "pip", "install", "--python", py,
    "--prerelease=allow", "sglang-omni==0.1.7",
])

os.environ["HF_HOME"] = "/kaggle/temp/huggingface"
os.environ["HF_HUB_CACHE"] = "/kaggle/temp/huggingface/hub"
os.makedirs(os.environ["HF_HOME"], exist_ok=True)

server_log = "/kaggle/working/sglang-server.log"
server_env = os.environ.copy()
server_env["CUDA_VISIBLE_DEVICES"] = "0,1"
server_env["SGLANG_OMNI_STARTUP_TIMEOUT"] = "1200"
server_env["PYTHONUNBUFFERED"] = "1"

server_cmd = [
    sgl, "serve",
    "--model-path", "MiniMaxAI/MiniMax-Music3",
    "--host", "127.0.0.1",
    "--port", "8000",
]
print("=== STARTING OFFICIAL DUAL-GPU SGLANG SERVER ===", flush=True)
print("GPU 0: autoregressive Music 3 stage; GPU 1: Flow/DAV stage", flush=True)
log = open(server_log, "w", encoding="utf-8")
server = subprocess.Popen(server_cmd, env=server_env, stdout=log, stderr=subprocess.STDOUT)

def stop_server():
    if server.poll() is None:
        try:
            server.send_signal(signal.SIGTERM)
            server.wait(timeout=30)
        except Exception:
            server.kill()
            server.wait(timeout=10)
    try:
        log.close()
    except Exception:
        pass

try:
    ready = False
    deadline = time.time() + 1200
    while time.time() < deadline:
        if server.poll() is not None:
            tail = Path(server_log).read_text(encoding="utf-8", errors="replace")[-12000:]
            raise RuntimeError("SGLang server exited during startup.\n" + tail)
        try:
            with urlopen("http://127.0.0.1:8000/v1/models", timeout=5) as resp:
                if resp.status == 200:
                    ready = True
                    print("SGLANG READY", flush=True)
                    break
        except Exception:
            pass
        time.sleep(5)
    if not ready:
        tail = Path(server_log).read_text(encoding="utf-8", errors="replace")[-12000:]
        raise TimeoutError("SGLang server did not become ready within 1200s.\n" + tail)

    max_new_tokens = max(125, min(7500, int(round(duration * 25))))
    body = {
        "model": "MiniMaxAI/MiniMax-Music3",
        "input": lyrics,
        "instructions": prompt,
        "seed": int(request.get("seed") or 1001),
        "max_new_tokens": max_new_tokens,
        "response_format": "wav",
        "stream": False,
    }
    request_path = "/kaggle/working/sglang_request.json"
    output_path = f"/kaggle/working/bikeztagram_minimax_music3_{job_id}.wav"
    Path(request_path).write_text(json.dumps(body, ensure_ascii=False), encoding="utf-8")

    print("=== RENDER START ===", flush=True)
    print(f"MAX_NEW_TOKENS={max_new_tokens}", flush=True)
    render_started = time.time()
    curl = [
        "curl", "--fail", "--silent", "--show-error",
        "--http1.1", "--max-time", "1200",
        "-X", "POST", "http://127.0.0.1:8000/v1/audio/speech",
        "-H", "Content-Type: application/json",
        "--data-binary", f"@{request_path}",
        "--output", output_path,
    ]
    run(curl)
    size = Path(output_path).stat().st_size
    if size < 10000:
        raise RuntimeError(f"SGLang returned an unexpectedly small WAV ({size} bytes).")
    print("=== RENDER COMPLETE ===", flush=True)
    print(f"RENDER_SECONDS={time.time() - render_started:.1f}", flush=True)
    print(f"DONE={output_path}", flush=True)
    print(f"BYTES={size}", flush=True)
finally:
    print("=== SHUTTING DOWN SGLANG ===", flush=True)
    stop_server()
