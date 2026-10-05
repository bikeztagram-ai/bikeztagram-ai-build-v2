"""RunPod Serverless worker for the private Bikeztagram MiniMax Music 3 renderer."""
import base64
import os
import subprocess
import tempfile
import uuid
from pathlib import Path

import requests
import soundfile as sf
import torch
from diffusers import ComponentsManager, ModularPipeline
from diffusers.hooks.group_offloading import apply_group_offloading

MODEL_ID = os.getenv("MINIMAX_MODEL_ID", "MiniMaxAI/MiniMax-Music3")
MAX_SECONDS = int(os.getenv("MUSIC_ENGINE_MAX_SECONDS", "180"))
MP3_BITRATE = os.getenv("MUSIC_ENGINE_MP3_BITRATE", "128k")

_pipe = None


def _load_pipeline():
    global _pipe
    if _pipe is not None:
        return _pipe
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is required for MiniMax Music 3.")
    manager = ComponentsManager()
    manager.enable_auto_cpu_offload(device="cuda")
    _pipe = ModularPipeline.from_pretrained(MODEL_ID, components_manager=manager)
    # FP16 is deliberately used for broad 24 GB GPU compatibility. The
    # streaming language-model offload is the same low-VRAM path validated by
    # the Kaggle T4 test and avoids requiring 24 GB of free VRAM at once.
    _pipe.load_components(dtype=torch.float16)
    apply_group_offloading(
        _pipe.language_model,
        onload_device=torch.device("cuda"),
        offload_type="leaf_level",
        use_stream=True,
        low_cpu_mem_usage=True,
    )
    return _pipe


def _caption(inp):
    parts = [
        str(inp.get("prompt") or "").strip(),
        f"Tempo {inp['bpm']} BPM" if inp.get("bpm") not in (None, "", "auto") else "",
        f"Key {inp['key']}" if inp.get("key") not in (None, "", "auto") else "",
        f"Mode {inp['mode']}" if inp.get("mode") not in (None, "", "auto") else "",
        str(inp.get("vocalDirection") or "").strip(),
        "instrumental only" if inp.get("forceInstrumental") else "clear melodic lead vocal",
    ]
    return ". ".join(x for x in parts if x)


def _encode_audio(audio, pipe, duration):
    with tempfile.TemporaryDirectory(prefix="bikeztagram-music-") as tmp:
        wav = Path(tmp) / "song.wav"
        arr = audio.detach().float().cpu().numpy() if hasattr(audio, "detach") else __import__("numpy").asarray(audio)
        arr = arr.T if arr.ndim == 2 else arr
        sf.write(wav, arr, pipe.sampling_rate, subtype="PCM_16")
        # Vercel's function response limit makes raw multi-minute WAV unsuitable
        # as an API payload. The GPU uploads the original WAV directly to Blob;
        # this encoded copy is only a local fallback/debug result.
        mp3 = Path(tmp) / "song.mp3"
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
            "-codec:a", "libmp3lame", "-b:a", MP3_BITRATE, str(mp3)
        ], check=True)
        data = mp3.read_bytes()
        return base64.b64encode(data).decode("ascii"), "audio/mpeg"


def _upload_blob(pathname, upload_url, wav_bytes):
    response = requests.put(upload_url, data=wav_bytes, headers={
        "Content-Type": "audio/wav",
        "x-vercel-blob-add-random-suffix": "0",
    }, timeout=180)
    if response.status_code >= 300:
        raise RuntimeError(f"Vercel Blob upload failed (HTTP {response.status_code}): {response.text[:500]}")
    return pathname


def generate(inp):
    duration = max(5, min(MAX_SECONDS, int(inp.get("duration") or 30)))
    pipe = _load_pipeline()
    lyrics = str(inp.get("lyrics") or "").strip()
    prompt = _caption(inp)
    seed = int(inp.get("seed") or 0)
    audio = pipe(
        prompt=prompt,
        lyrics=lyrics,
        audio_duration=float(duration),
        generator=torch.Generator("cuda").manual_seed(seed),
        output="audios",
    )[0]

    # Always write the lossless WAV first. If a presigned Blob URL was supplied,
    # the full-quality file goes directly from GPU worker to Blob, bypassing all
    # serverless response-size limits.
    with tempfile.TemporaryDirectory(prefix="bikeztagram-music-") as tmp:
        wav_path = Path(tmp) / "song.wav"
        arr = audio.detach().float().cpu().numpy() if hasattr(audio, "detach") else __import__("numpy").asarray(audio)
        arr = arr.T if arr.ndim == 2 else arr
        sf.write(wav_path, arr, pipe.sampling_rate, subtype="PCM_16")
        wav_bytes = wav_path.read_bytes()
        pathname = str(inp.get("output_path") or f"music-engine/{uuid.uuid4()}.wav")
        upload_url = str(inp.get("output_put_url") or "").strip()
        if upload_url:
            _upload_blob(pathname, upload_url, wav_bytes)
            return {
                "status": "completed",
                "pathname": pathname,
                "mime_type": "audio/wav",
                "song_id": str(uuid.uuid4()),
                "generated_lyrics": not bool(str(inp.get("lyrics") or "").strip()),
                "duration": duration,
            }
        encoded, mime = _encode_audio(audio, pipe, duration)
        return {
            "status": "completed",
            "audio_base64": encoded,
            "mime_type": mime,
            "song_id": str(uuid.uuid4()),
            "generated_lyrics": not bool(str(inp.get("lyrics") or "").strip()),
            "duration": duration,
        }


def handler(event):
    return generate(event.get("input") or {})


if __name__ == "__main__":
    import runpod
    runpod.serverless.start({"handler": handler})
