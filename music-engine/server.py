"""Local development contract for the Bikeztagram Music Engine.

Production generation is dispatched to the zero-cost Kaggle worker. This file
exists only as a lightweight health surface for local development; it does not
contain a second GPU architecture.
"""
from fastapi import FastAPI

app = FastAPI(title="Bikeztagram Music Engine", version="3.0.0")

@app.get("/health")
async def health():
    return {
        "ok": True,
        "engine": "Bikeztagram Music Engine",
        "renderer": "MiniMax-Music3",
        "compute": "Kaggle free GPU on demand",
        "hosted_generation_fallback": False,
    }
