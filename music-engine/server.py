"""Bikeztagram Music Engine — self-hostable MiniMax Music 3 runtime gateway."""
import asyncio, os, re, uuid
from typing import Optional

import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

app = FastAPI(title="Bikeztagram Music Engine", version="1.1.0")
SGLANG_URL = os.getenv("MINIMAX_SGLANG_URL", "http://127.0.0.1:8000").rstrip("/")
MAX_SECONDS = int(os.getenv("MUSIC_ENGINE_MAX_SECONDS", "300"))
STOP_URL = os.getenv("MUSIC_ENGINE_STOP_URL", "").strip()
STOP_TOKEN = os.getenv("MUSIC_ENGINE_STOP_TOKEN", "").strip()
STOP_DELAY_SECONDS = float(os.getenv("MUSIC_ENGINE_STOP_DELAY_SECONDS", "2"))
ACTIVE_GENERATIONS = 0
ACTIVE_LOCK = asyncio.Lock()

class GenerateRequest(BaseModel):
    prompt: str = ""
    lyrics: str = ""
    duration: int = Field(default=30, ge=5, le=300)
    bpm: Optional[str | int] = "auto"
    key: str = "auto"
    mode: str = "auto"
    vocalLanguage: str = "en"
    vocalDirection: str = ""
    forceInstrumental: bool = False
    seed: Optional[int] = None

def words(prompt):
    return [w for w in re.sub(r"[^a-zA-Z0-9' ]", " ", prompt).split() if len(w) > 3][:8]

def director_lyrics(req):
    if req.forceInstrumental:
        return "[Intro]\n(instrumental)\n[Verse]\n(instrumental)\n[Chorus]\n(instrumental)"
    if req.lyrics.strip():
        return req.lyrics.strip()
    subject = " ".join(words(req.prompt)) or "the road tonight"
    return f"""[Verse 1]
Under the midnight sky, we move into the light
Every heartbeat finds a rhythm in the night
We carry {subject} through the night
And turn the silence into something bright

[Pre-Chorus]
No turning back, no looking down
We feel the music shake the ground

[Chorus]
{subject.title()} tonight
We are alive and we are moving
{subject.title()} tonight
Every heartbeat keeps improving

[Verse 2]
We keep the rhythm underneath our feet
Every road becomes another beat

[Bridge]
Let the music rise and pull us through
Make this moment something new

[Final Chorus]
{subject.title()} tonight
We are alive and we are moving
{subject.title()} tonight
Every heartbeat keeps improving"""

def caption(req):
    parts = [
        req.prompt.strip() or "an original cinematic song",
        f"Tempo {req.bpm} BPM" if req.bpm not in (None, "auto", "") else "",
        f"Key {req.key}" if req.key != "auto" else "",
        f"Mode {req.mode}" if req.mode != "auto" else "",
        req.vocalDirection.strip(),
        "instrumental only" if req.forceInstrumental else "clear melodic lead vocal",
    ]
    return ". ".join(x for x in parts if x)

async def finish_generation():
    global ACTIVE_GENERATIONS
    async with ACTIVE_LOCK:
        ACTIVE_GENERATIONS = max(0, ACTIVE_GENERATIONS - 1)
        should_stop = ACTIVE_GENERATIONS == 0
    if not should_stop:
        return
    await shutdown_after_response()

async def reserve_generation():
    global ACTIVE_GENERATIONS
    async with ACTIVE_LOCK:
        if ACTIVE_GENERATIONS > 0:
            raise HTTPException(409, "Music Engine is already rendering another song. Try again when it finishes.")
        ACTIVE_GENERATIONS += 1

async def release_failed_generation():
    global ACTIVE_GENERATIONS
    async with ACTIVE_LOCK:
        ACTIVE_GENERATIONS = max(0, ACTIVE_GENERATIONS - 1)

async def shutdown_after_response():
    """Tell the GPU provider to stop this worker after audio has been returned."""
    if not STOP_URL:
        return
    try:
        await asyncio.sleep(max(0, STOP_DELAY_SECONDS))
        headers = {"Authorization": f"Bearer {STOP_TOKEN}"} if STOP_TOKEN else {}
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                STOP_URL,
                headers=headers,
                json={"reason": "bikeztagram-music-generation-complete"},
            )
        if response.status_code >= 300:
            print(f"Music Engine stop request returned HTTP {response.status_code}")
    except Exception as exc:
        # Never turn a successful song into a failed request because shutdown failed.
        print(f"Music Engine shutdown request failed: {exc}")

@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(SGLANG_URL + "/v1/models")
        upstream = r.status_code == 200
    except Exception:
        upstream = False
    return {
        "ok": upstream,
        "engine": "Bikeztagram Music Engine",
        "renderer": "MiniMax-Music3 via SGLang-Omni",
        "upstream": SGLANG_URL,
        "lifecycle": {
            "auto_shutdown": bool(STOP_URL),
            "shutdown_delay_seconds": STOP_DELAY_SECONDS if STOP_URL else None,
        },
        "contract": "OpenAI-compatible /v1/audio/speech",
    }

@app.post("/v1/generate")
async def generate(req: GenerateRequest, background_tasks: BackgroundTasks):
    await reserve_generation()
    if req.duration > MAX_SECONDS:
        await release_failed_generation()
        raise HTTPException(400, f"Maximum duration is {MAX_SECONDS} seconds.")

    lyrics = director_lyrics(req)
    instructions = caption(req)
    payload = {
        "model": "MiniMaxAI/MiniMax-Music3",
        "input": lyrics,
        "instructions": instructions,
        "max_new_tokens": int(req.duration * 25),
        "seed": req.seed if req.seed is not None else 0,
        "response_format": "wav",
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=max(600, req.duration * 8)) as client:
            r = await client.post(SGLANG_URL + "/v1/audio/speech", json=payload)
    except Exception as exc:
        await release_failed_generation()
        raise HTTPException(503, "MiniMax-Music3 self-host renderer is unavailable.") from exc

    if r.status_code != 200:
        await release_failed_generation()
        raise HTTPException(
            502,
            f"MiniMax-Music3 renderer failed (HTTP {r.status_code}). {r.text[:1200]}",
        )
    if not r.content:
        await release_failed_generation()
        raise HTTPException(502, "MiniMax-Music3 renderer returned empty audio.")

    # Queue lifecycle finalization only after the response has been sent. The
    # provider is stopped only when this was the last active generation.
    background_tasks.add_task(finish_generation)

    return Response(
        content=r.content,
        media_type=r.headers.get("content-type", "audio/wav"),
        headers={
            "X-Bikeztagram-Music-Provider": "Bikeztagram Music Engine · MiniMax-Music3",
            "X-Bikeztagram-Music-Song-Id": str(uuid.uuid4()),
            "X-Bikeztagram-Music-Lyrics-Generated": "yes" if not req.lyrics.strip() else "no",
        },
    )
