"""Bikeztagram ZeroGPU adapter.

Runs the same Wan2.1 generation contract inside a Hugging Face ZeroGPU Space.
This is a proof/bridge adapter: it keeps generation free within the account's
included ZeroGPU quota and never introduces a paid provider fallback.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

import gradio as gr
import spaces
import torch

MODEL_ID = os.getenv("WAN_MODEL_ID", "Wan-AI/Wan2.1-T2V-1.3B")
MAX_SECONDS = 5

_pipe = None


def load_pipeline():
    global _pipe
    if _pipe is None:
        from diffusers import WanPipeline
        _pipe = WanPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16,
        )
        _pipe.to("cuda")
    return _pipe


@spaces.GPU(duration=300)
def generate(prompt: str, seconds: int = 3, seed: int = 0):
    prompt = (prompt or "").strip()
    if len(prompt) < 3:
        raise gr.Error("Prompt is required")
    seconds = max(1, min(MAX_SECONDS, int(seconds)))
    pipe = load_pipeline()

    # Keep the first proof deliberately small. The adapter can be upgraded to
    # the official Wan repository runner if the Diffusers pipeline is not
    # available on the selected ZeroGPU runtime.
    generator = torch.Generator(device="cuda").manual_seed(int(seed))
    frames = 4 * (8 * seconds) + 1
    result = pipe(
        prompt=prompt,
        num_frames=frames,
        height=480,
        width=832,
        guidance_scale=5.0,
        generator=generator,
    )

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        output = Path(f.name)
    from diffusers.utils import export_to_video
    export_to_video(result.frames[0], str(output), fps=16)
    return str(output)


with gr.Blocks(title="Bikeztagram ZeroGPU Worker") as demo:
    gr.Markdown("# Bikeztagram free AI video worker")
    gr.Markdown("Short proof generations only. No paid provider fallback.")
    prompt = gr.Textbox(label="Prompt", placeholder="A cinematic motorcycle ride at sunset")
    seconds = gr.Slider(1, MAX_SECONDS, value=3, step=1, label="Seconds")
    seed = gr.Number(value=0, precision=0, label="Seed")
    button = gr.Button("Generate")
    video = gr.Video(label="Generated video")
    button.click(generate, inputs=[prompt, seconds, seed], outputs=video)


demo.launch()
