"""Bikeztagram Music Engine — local/self-hosted FastAPI gateway using the same MiniMax renderer as RunPod."""
import base64
import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from runpod_renderer import generate

app = FastAPI(title="Bikeztagram Music Engine", version="2.0.0")
MAX_SECONDS = int(os.getenv("MUSIC_ENGINE_MAX_SECONDS", "180"))

class GenerateRequest(BaseModel):
    prompt: str = ""
    lyrics: str = ""
    duration: int = Field(default=30, ge=5, le=180)
    bpm: str | int = "auto"
    key: str = "auto"
    mode: str = "auto"
    vocalLanguage: str = "en"
    vocalDirection: str = ""
    forceInstrumental: bool = False
    seed: int | None = None

@app.get("/health")
async def health():
    return {
        "ok": True,
        "engine": "Bikeztagram Music Engine",
        "renderer": "MiniMax-Music3 via Diffusers ModularPipeline",
        "lifecycle": "provider controls scale-to-zero; local mode stays running",
    }

@app.post("/v1/generate")
async def generate_route(req: GenerateRequest):
    if req.duration > MAX_SECONDS:
        raise HTTPException(400, f"Maximum duration is {MAX_SECONDS} seconds.")
    try:
        result = generate(req.model_dump())
        if result.get("audio_base64"):
            audio = base64.b64decode(result["audio_base64"])
            mime = result.get("mime_type", "audio/mpeg")
        else:
            raise RuntimeError("Local renderer requires no output URL and returned no inline audio.")
        return Response(content=audio, media_type=mime, headers={
            "X-Bikeztagram-Music-Provider": "Bikeztagram Music Engine · MiniMax-Music3",
            "X-Bikeztagram-Music-Song-Id": result.get("song_id", ""),
            "X-Bikeztagram-Music-Lyrics-Generated": "yes" if result.get("generated_lyrics") else "no",
        })
    except Exception as exc:
        raise HTTPException(503, f"MiniMax Music 3 renderer failed: {exc}") from exc
