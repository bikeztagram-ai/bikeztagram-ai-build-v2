"""Bikeztagram zero-cost AI video worker.

Runs on a user-owned or legitimately free GPU machine (for example a free
notebook session). The web app sends a prompt; this worker performs the actual
open-source text-to-video generation with Wan2.1 T2V-1.3B.

This process intentionally has no paid-provider fallback.
"""

from __future__ import annotations

import os
import secrets
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Final

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

ROOT: Final = Path(os.environ.get("BIKEZ_WORKER_ROOT", "/workspace/bikeztagram-worker"))
WAN_DIR: Final = ROOT / "Wan2.1"
MODEL_DIR: Final = ROOT / "Wan2.1-T2V-1.3B"
OUTPUT_DIR: Final = ROOT / "outputs"
TOKEN = os.environ.get("BIKEZ_WORKER_TOKEN", "")
MAX_SECONDS = int(os.environ.get("BIKEZ_MAX_SECONDS", "5"))

app = FastAPI(title="Bikeztagram Zero-Cost Video Worker", version="1.0")


class GenerationRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=4000)
    seconds: int = Field(default=5, ge=1, le=5)
    width: int = Field(default=832, ge=256, le=1280)
    height: int = Field(default=480, ge=256, le=720)
    seed: int | None = Field(default=None, ge=0)


def require_token(provided: str | None) -> None:
    if not TOKEN:
        raise HTTPException(503, "Worker token is not configured")
    if not provided or not secrets.compare_digest(provided, TOKEN):
        raise HTTPException(401, "Invalid worker token")


def ensure_runtime() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if not WAN_DIR.exists():
        subprocess.run(
            ["git", "clone", "--depth", "1", "https://github.com/Wan-Video/Wan2.1.git", str(WAN_DIR)],
            check=True,
        )
    if not MODEL_DIR.exists():
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-q", "huggingface_hub[cli]"],
            check=True,
        )
        subprocess.run(
            ["huggingface-cli", "download", "Wan-AI/Wan2.1-T2V-1.3B", "--local-dir", str(MODEL_DIR)],
            check=True,
        )


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "engine": "Wan2.1-T2V-1.3B",
        "mode": "text-to-video",
        "zeroCostOnly": True,
        "gpuRequired": True,
        "modelReady": MODEL_DIR.exists(),
    }


@app.post("/generate")
def generate(request: GenerationRequest, x_bikeztagram_token: str | None = Header(default=None)):
    require_token(x_bikeztagram_token)
    if not request.prompt.strip():
        raise HTTPException(400, "Prompt is required")
    if request.seconds > MAX_SECONDS:
        raise HTTPException(400, f"Maximum generation duration is {MAX_SECONDS} seconds")

    ensure_runtime()
    size = f"{request.width}*{request.height}"
    output_name = f"bikeztagram-{secrets.token_hex(8)}.mp4"
    output_path = OUTPUT_DIR / output_name

    cmd = [
        sys.executable,
        str(WAN_DIR / "generate.py"),
        "--task", "t2v-1.3B",
        "--size", size,
        "--ckpt_dir", str(MODEL_DIR),
        "--offload_model", "True",
        "--t5_cpu",
        "--sample_shift", "8",
        "--sample_guide_scale", "6",
        "--prompt", request.prompt.strip(),
    ]
    if request.seed is not None:
        cmd.extend(["--seed", str(request.seed)])

    # Wan's CLI writes to its output directory. Keep the worker isolated and
    # then move the newest generated mp4 to our controlled output path.
    with tempfile.TemporaryDirectory(prefix="bikeztagram-wan-") as tmp:
        subprocess.run(cmd + ["--save_file", str(Path(tmp) / "generated.mp4")], check=True)
        generated = Path(tmp) / "generated.mp4"
        if not generated.exists():
            raise HTTPException(500, "Wan2.1 completed without producing a video file")
        generated.replace(output_path)

    return FileResponse(output_path, media_type="video/mp4", filename=output_name)
