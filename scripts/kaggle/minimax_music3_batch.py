import os
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

print("=== BIKEZTAGRAM / MINIMAX MUSIC 3 LOW-VRAM BATCH ===", flush=True)

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

run([sys.executable, "-m", "pip", "install", "-q", "--no-input", "uv"])
run([sys.executable, "-m", "uv", "python", "install", "3.12"])

venv = "/kaggle/temp/music3-venv"
if os.path.exists(venv):
    shutil.rmtree(venv, ignore_errors=True)
run([sys.executable, "-m", "uv", "venv", venv, "--python", "3.12"])
py = f"{venv}/bin/python"

# Official MiniMax low-VRAM route: CPU offload plus layerwise streaming.
run([
    sys.executable, "-m", "uv", "pip", "install", "--python", py,
    "git+https://github.com/huggingface/diffusers.git",
    "transformers", "accelerate", "safetensors", "soundfile", "bitsandbytes",
])

print("=== GPU PRE-FLIGHT ===", flush=True)
print(gpu_snapshot(), flush=True)
if not gpu_snapshot().strip():
    raise RuntimeError("No CUDA GPU detected.")

os.makedirs("/kaggle/temp/huggingface/hub", exist_ok=True)
os.environ["HF_HOME"] = "/kaggle/temp/huggingface"
os.environ["HF_HUB_CACHE"] = "/kaggle/temp/huggingface/hub"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

started = time.time()
print("=== STARTING MINIMAX MUSIC 3 LOW-VRAM ENGINE ===", flush=True)
print("Backend: Diffusers ModularPipeline", flush=True)
print("Mode: automatic CPU offload + language-model leaf offload", flush=True)
print("GPU: T4 #0; T4 #1 intentionally unused for this memory diagnostic", flush=True)

try:
    import torch
    print(f"PyTorch={torch.__version__}", flush=True)
    print(f"CUDA={torch.cuda.is_available()} device={torch.cuda.get_device_name(0)}", flush=True)

    from diffusers import ComponentsManager, ModularPipeline
    from diffusers.hooks import apply_group_offloading

    manager = ComponentsManager()
    manager.enable_auto_cpu_offload(device="cuda")

    print("Loading MiniMax Music 3 pipeline...", flush=True)
    pipe = ModularPipeline.from_pretrained(
        "MiniMaxAI/MiniMax-Music3",
        components_manager=manager,
    )

    # T4 is SM75; FP16 is the safe compute dtype. Prefer an 8-bit
    # quantized Qwen language model so the 8B autoregressive stage can stay
    # resident instead of streaming every layer over CPU<->GPU.
    quantized_lm = False
    try:
        from transformers import BitsAndBytesConfig
        lm_quant = BitsAndBytesConfig(load_in_8bit=True, llm_int8_enable_fp32_cpu_offload=False)
        pipe.load_components(dtype=torch.float16, quantization_config={"language_model": lm_quant})
        quantized_lm = True
        print("Language model mode: 8-bit BitsAndBytes on T4", flush=True)
    except Exception as exc:
        print(f"8-bit language-model path unavailable; using streaming offload fallback: {exc}", flush=True)
        pipe.load_components(dtype=torch.float16)
        print("Applying leaf-level streaming offload to language model...", flush=True)
        apply_group_offloading(
            pipe.language_model,
            onload_device=torch.device("cuda"),
            offload_type="leaf_level",
            use_stream=True,
            low_cpu_mem_usage=True,
        )

    print(f"=== MUSIC 3 READY === quantized_lm={quantized_lm}", flush=True)
    print(f"GPU status before render: {gpu_snapshot()}", flush=True)

    request = dict(globals().get("EMBEDDED_REQUEST") or {})
    request_source = "embedded"
    for candidate in (Path.cwd() / "music_request.json", Path("/kaggle/working/music_request.json")):
        if candidate.exists():
            request = json.loads(candidate.read_text(encoding="utf-8"))
            request_source = str(candidate)
            break

    print(f"REQUEST_SOURCE={request_source}", flush=True)
    print(f"REQUEST_HAS_LYRICS={bool(str(request.get('lyrics') or '').strip())}", flush=True)
    print(f"REQUEST_FORCE_INSTRUMENTAL={bool(request.get('forceInstrumental'))}", flush=True)

    job_id = str(request.get("job_id") or "local-test")
    lyrics = str(request.get("lyrics") or "").strip()
    prompt = str(request.get("prompt") or "").strip()
    duration = max(5.0, min(300.0, float(request.get("duration") or 30)))
    force_instrumental = bool(request.get("forceInstrumental"))
    if force_instrumental:
        lyrics = ""
    elif not lyrics:
        raise ValueError("Music Studio supplied no lyrics. MiniMax Music 3 requires non-empty lyrics for vocal generation.")
    if not prompt:
        prompt = "Genre: cinematic electronic rock. BPM: 105. Key: D minor. Deep punchy drums, pulsing bass, distorted electric guitar, atmospheric synths, dramatic build and a huge energetic chorus. Polished modern production."

    print(f"JOB_ID={job_id}", flush=True)
    print(f"DURATION={duration}", flush=True)

    print("=== RENDER START ===", flush=True)
    render_started = time.time()
    # A 30s MiniMax render normally completes in a few minutes on the T4.
    # Hard-stop pathological inference hangs so a free Kaggle session cannot
    # sit occupied indefinitely. Scale slightly with requested duration.
    render_timeout = max(600, min(1200, int(duration * 24)))
    print(f"RENDER_TIMEOUT_SECONDS={render_timeout}", flush=True)

    import signal
    def _render_timeout_handler(signum, frame):
        raise TimeoutError(f"MiniMax inference exceeded {render_timeout}s render timeout")

    signal.signal(signal.SIGALRM, _render_timeout_handler)
    signal.alarm(render_timeout)
    try:
        audio = pipe(
            prompt=prompt,
            lyrics=lyrics,
            audio_duration=duration,
            generator=torch.Generator("cuda").manual_seed(1001),
            output="audios",
        )[0]
    finally:
        signal.alarm(0)

    import soundfile as sf
    out = f"/kaggle/working/bikeztagram_minimax_music3_{job_id}.wav"
    import numpy as np
    audio_np = np.asarray(audio)
    if audio_np.ndim == 2:
        audio_np = audio_np.T
    audio_np = audio_np.astype(np.float32, copy=False)
    sf.write(out, audio_np, pipe.sampling_rate)

    print("=== RENDER COMPLETE ===", flush=True)
    print(f"RENDER_SECONDS={time.time() - render_started:.1f}", flush=True)
    print(f"TOTAL_SECONDS={time.time() - started:.1f}", flush=True)
    print(f"DONE={out}", flush=True)
    print(f"BYTES={Path(out).stat().st_size}", flush=True)
    print(f"GPU status after render: {gpu_snapshot()}", flush=True)

finally:
    print("=== SHUTTING DOWN LOW-VRAM MUSIC 3 ENGINE ===", flush=True)
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass
    print("ENGINE_SHUTDOWN=TRUE", flush=True)
