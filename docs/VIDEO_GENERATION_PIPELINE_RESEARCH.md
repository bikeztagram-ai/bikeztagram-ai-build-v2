# Bikeztagram AI video-generation architecture research

Date: 2026-10-10

## Findings from official model/provider documentation

- Modern video models use spatiotemporal diffusion/DiT-style generation in a compressed latent representation. Temporal consistency is a core challenge: the subject, scene and camera motion need to remain coherent across frames. Source: Hugging Face Diffusers video-generation documentation, https://huggingface.co/docs/diffusers/en/using-diffusers/text-img2vid and Runway's explainer, https://runway.com/resources/how-ai-video-generation-works.
- Stronger creator workflows condition a shot on visual inputs, not text alone. Google Veo 3.1 supports initial images, first/last frames, up to three reference images on supported models, and scene extension: https://ai.google.dev/gemini-api/docs/veo and https://deepmind.google/models/veo/.
- LTX-2 supports text-to-video, image-to-video, multi-keyframe conditioning, video extension and synchronized audio/video, but self-hosting needs substantial compute; hosted links may be paid: https://github.com/Lightricks/LTX-Video and https://docs.ltx.io/open-source-model/usage-guides/image-to-video.
- Hugging Face Spaces can expose Gradio API endpoints, but each Space has its own endpoint name and input/output schema. The schema must be inspected rather than guessed. Public ZeroGPU usage is quota-limited (currently documented as 5 GPU minutes/day for a free account; shared availability and queues vary): https://huggingface.co/docs/hub/en/spaces-api-endpoints and https://huggingface.co/docs/hub/main/spaces-zerogpu.
- Runway's official API uses asynchronous task creation and status polling. It is a paid service and must be an explicit choice: https://docs.dev.runwayml.com/guides/using-the-api/.

## Pipeline architecture to implement

1. **Creative brief compiler** — extract subject, world, actions, style, camera, lighting, aspect ratio and duration.
2. **Shot graph** — build a deliberate sequence with establishing, action/detail, tracking/chase and hero/end shots.
3. **Continuity pack** — repeat exact subject identifiers and visual traits in each shot prompt; when a compatible provider supports it, pass reference images and/or first/last keyframes.
4. **Provider registry + preflight** — check configured provider capabilities before generating anything; no hidden fallback to a paid provider.
5. **Bounded shot generation** — use a small concurrency limit, retain shot-to-media identity, surface individual failures, and never label procedural output as AI video.
6. **Assembly and audio** — align cut duration/transitions to the music beat grid; preserve provider audio only when explicitly requested and otherwise mix the generated/selected soundtrack.
7. **Quality gate** — verify non-empty playable output, clip duration, subject/shot coverage, and audio attachment before export.
8. **Iterative improvement** — repair only failed shots/criteria instead of rerunning every shot.

## Changes in this pass

- Added a no-cost GET preflight response for provider readiness.
- Added a server-side paid-generation consent gate. Runway requests without explicit `allowPaid: true` are rejected before a generation task is created.
- Added explicit opt-in controls to both prompt-only creation and the universal filmmaker.
- Propagated consent through text-to-video and reference-photo animation.
- Clearly disclose that a free AI provider is not connected yet; do not imply a public Space is a reliable, universally compatible API.

## Important next engineering pass

Implement a Hugging Face/Gradio adapter only after choosing a verified Space and inspecting its live `/gradio_api/openapi.json` or “Use via API” schema. The adapter must handle file upload, queued task IDs, progress/result polling, returned video file paths and quota/queue failures. A generic endpoint with guessed parameters would be unreliable and would repeat the current failure mode.
