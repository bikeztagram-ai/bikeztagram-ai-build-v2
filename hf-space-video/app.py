import spaces
import gradio as gr
import torch
import tempfile
import os
from PIL import Image
from diffusers import DiffusionPipeline
from diffusers.utils import export_to_video

MODEL_ID = "Wan-AI/Wan2.2-TI2V-5B-Diffusers"
pipe = DiffusionPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16)
pipe.enable_model_cpu_offload()

def build_prompt(prompt):
    prompt = (prompt or "").strip()
    if not prompt:
        raise gr.Error("Describe the shot first.")
    return (
        prompt
        + " Cinematic composition, coherent physical motion, consistent subject identity, "
          "natural camera movement, detailed lighting, no subtitles, no watermark."
    )

@spaces.GPU(duration=180)
def generate_video(prompt, image, duration_seconds, seed):
    prompt = build_prompt(prompt)
    duration_seconds = max(2, min(4, int(duration_seconds or 2)))
    frames = duration_seconds * 16 + 1
    generator = torch.Generator(device="cpu").manual_seed(int(seed or 42))
    kwargs = {
        "prompt": prompt,
        "negative_prompt": "still image, frozen motion, flicker, deformed anatomy, extra wheels, broken geometry, subtitles, watermark, low quality",
        "height": 480,
        "width": 832,
        "num_frames": frames,
        "num_inference_steps": 8,
        "guidance_scale": 4.0,
        "generator": generator,
    }
    if image is not None:
        kwargs["image"] = image
    result = pipe(**kwargs)
    frames_out = result.frames[0]
    fd, output_path = tempfile.mkstemp(suffix=".mp4")
    os.close(fd)
    export_to_video(frames_out, output_path, fps=16)
    return output_path, f"Generated {duration_seconds}s • Wan 2.2 TI2V 5B • seed {int(seed or 42)}"

with gr.Blocks(title="Bikeztagram AI Video Engine") as demo:
    gr.Markdown("# Bikeztagram AI — Free-first Video Engine\nWan 2.2 text-to-video and image-to-video. Short clips are intentional to fit shared GPU quotas.")
    prompt = gr.Textbox(label="Shot prompt", lines=4, placeholder="A candy-blue Kawasaki-style sportbike ridden through a rainy neon city, low tracking camera...")
    image = gr.Image(label="Optional reference image", type="pil")
    with gr.Row():
        duration = gr.Radio(choices=[2, 3, 4], value=2, label="Clip duration (seconds)")
        seed = gr.Number(value=42, precision=0, label="Seed")
    output = gr.Video(label="Generated shot")
    info = gr.Textbox(label="Generation details", interactive=False)
    button = gr.Button("Generate shot", variant="primary")
    button.click(generate_video, inputs=[prompt, image, duration, seed], outputs=[output, info], api_name="generate_video")

demo.queue(max_size=8, default_concurrency_limit=1)
demo.launch()
