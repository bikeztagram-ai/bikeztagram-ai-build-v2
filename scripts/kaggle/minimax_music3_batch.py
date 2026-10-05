import os
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
    "transformers", "accelerate", "safetensors", "soundfile",
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

    # T4 is SM75; FP16 avoids native-BF16 requirements while keeping VRAM low.
    pipe.load_components(dtype=torch.float16)

    print("Applying leaf-level streaming offload to language model...", flush=True)
    apply_group_offloading(
        pipe.language_model,
        onload_device=torch.device("cuda"),
        offload_type="leaf_level",
        use_stream=True,
    )

    print("=== MUSIC 3 READY ===", flush=True)
    print(f"GPU status before render: {gpu_snapshot()}", flush=True)

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

    prompt = (
        "Genre: cinematic electronic rock. BPM: 105. Key: D minor. "
        "Deep punchy drums, pulsing bass, distorted electric guitar, "
        "atmospheric synths, dramatic build and a huge energetic chorus. "
        "Polished modern production. Strong clear lead vocal."
    )

    print("=== RENDER START ===", flush=True)
    render_started = time.time()

    audio = pipe(
        prompt=prompt,
        lyrics=lyrics,
        audio_duration=30.0,
        generator=torch.Generator("cuda").manual_seed(1001),
        output="audios",
    )[0]

    import soundfile as sf
    out = "/kaggle/working/bikeztagram_minimax_music3_test.wav"
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
