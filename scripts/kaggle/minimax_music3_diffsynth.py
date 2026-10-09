import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

# Kaggle's /kaggle/working filesystem is comparatively small. ModelScope
# shards can total many GB, and the default ~/.cache can fill the root disk.
# Put model downloads, temporary files, pip cache and disk offload on the
# large ephemeral /kaggle/temp volume instead.
TEMP_ROOT = Path("/kaggle/temp/bikeztagram-music3")
for folder in ("modelscope", "huggingface", "torch", "tmp", "pip-cache", "offload"):
    (TEMP_ROOT / folder).mkdir(parents=True, exist_ok=True)
os.environ["MODELSCOPE_CACHE"] = str(TEMP_ROOT / "modelscope")
os.environ["HF_HOME"] = str(TEMP_ROOT / "huggingface")
os.environ["HUGGINGFACE_HUB_CACHE"] = str(TEMP_ROOT / "huggingface" / "hub")
os.environ["TORCH_HOME"] = str(TEMP_ROOT / "torch")
os.environ["TMPDIR"] = str(TEMP_ROOT / "tmp")
os.environ["TMP"] = str(TEMP_ROOT / "tmp")
os.environ["TEMP"] = str(TEMP_ROOT / "tmp")
os.environ["PIP_CACHE_DIR"] = str(TEMP_ROOT / "pip-cache")

def print_disk_usage(label, path):
    usage = shutil.disk_usage(path)
    print(f"DISK_{label} total_gb={usage.total / 1024**3:.1f} free_gb={usage.free / 1024**3:.1f}", flush=True)

print("=== BIKEZTAGRAM / MINIMAX MUSIC 3 DIFFSYNTH LOW-VRAM ===", flush=True)
print(f"MODEL_CACHE_ROOT={TEMP_ROOT}", flush=True)
print_disk_usage("WORKING", "/kaggle/working")
print_disk_usage("TEMP", "/kaggle/temp")

request = dict(globals().get("EMBEDDED_REQUEST") or {})
for candidate in (Path.cwd() / "music_request.json", Path("/kaggle/working/music_request.json")):
    if candidate.exists():
        request = json.loads(candidate.read_text(encoding="utf-8"))
        break

job_id = str(request.get("job_id") or "local-test")
prompt = str(request.get("prompt") or "").strip()
lyrics = str(request.get("lyrics") or "").strip()
duration = max(5.0, min(300.0, float(request.get("duration") or 30)))
if bool(request.get("forceInstrumental")):
    lyrics = ""
elif not lyrics:
    raise ValueError("Music Studio supplied no lyrics. MiniMax Music 3 requires non-empty lyrics for vocal generation.")
if not prompt:
    prompt = "Genre: cinematic electronic rock. BPM: 105. Key: D minor. Deep punchy drums, pulsing bass, atmospheric synths, dramatic build and a huge energetic chorus."

print(f"JOB_ID={job_id}", flush=True)
print(f"DURATION={duration}", flush=True)
print(f"REQUEST_HAS_LYRICS={bool(lyrics)}", flush=True)

subprocess.run([
    sys.executable, "-m", "pip", "install", "-q", "--no-input", "--no-cache-dir",
    "git+https://github.com/modelscope/DiffSynth-Studio.git",
    "modelscope",
], check=True)

import torch
from diffsynth.pipelines.minimax_music3 import MiniMaxMusic3Pipeline, ModelConfig
from diffsynth.utils.data.audio import save_audio

if not torch.cuda.is_available():
    raise RuntimeError("No CUDA GPU detected.")

vram_limit = torch.cuda.mem_get_info("cuda")[1] / (1024 ** 3) - 0.5
print(f"GPU={torch.cuda.get_device_name(0)}", flush=True)
print(f"VRAM_LIMIT_GB={vram_limit:.2f}", flush=True)

vram_config = {
    "offload_dtype": "disk",
    "offload_device": "disk",
    "onload_dtype": torch.bfloat16,
    "onload_device": "cpu",
    "preparing_dtype": torch.bfloat16,
    "preparing_device": "cuda",
    "computation_dtype": torch.bfloat16,
    "computation_device": "cuda",
}
configs = [
    ModelConfig(model_id="MiniMax/MiniMax-Music3", origin_file_pattern="language_model/model*.safetensors", **vram_config),
    ModelConfig(model_id="MiniMax/MiniMax-Music3", origin_file_pattern="rvq_depth_decoder/diffusion_pytorch_model.safetensors", **vram_config),
    ModelConfig(model_id="MiniMax/MiniMax-Music3", origin_file_pattern="transformer/diffusion_pytorch_model*.safetensors", **vram_config),
    ModelConfig(model_id="MiniMax/MiniMax-Music3", origin_file_pattern="condition_encoder/diffusion_pytorch_model.safetensors", **vram_config),
    ModelConfig(model_id="MiniMax/MiniMax-Music3", origin_file_pattern="vocoder/diffusion_pytorch_model.safetensors", **vram_config),
]

print("=== LOADING DIFFSYNTH MINIMAX MUSIC 3 ===", flush=True)
pipe = MiniMaxMusic3Pipeline.from_pretrained(
    torch_dtype=torch.bfloat16,
    device="cuda",
    model_configs=configs,
    tokenizer_config=ModelConfig(model_id="MiniMax/MiniMax-Music3", origin_file_pattern="tokenizer/"),
    vram_limit=vram_limit,
)

print("=== DIFFSYNTH READY ===", flush=True)
started = time.time()
audio = pipe(
    prompt=prompt,
    lyrics=lyrics,
    max_audio_duration=duration,
    num_inference_steps=30,
    cfg_scale=1.7,
    seed=1001,
)

out = f"/kaggle/working/bikeztagram_minimax_music3_{job_id}.wav"
save_audio(audio, 44100, out)
size = Path(out).stat().st_size
if size < 10000:
    raise RuntimeError(f"Generated WAV is unexpectedly small: {size} bytes")
print("=== RENDER COMPLETE ===", flush=True)
print(f"RENDER_SECONDS={time.time() - started:.1f}", flush=True)
print(f"DONE={out}", flush=True)
print(f"BYTES={size}", flush=True)
