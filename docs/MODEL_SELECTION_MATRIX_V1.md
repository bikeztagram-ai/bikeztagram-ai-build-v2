# Bikeztagram AI — Generation Model Selection Matrix V1

Research snapshot: 2026-08-21.

## Music

### Stable Audio 3.0 Small/Medium — priority candidate
- Stability announced open-weight Small and Medium models in May 2026.
- Supports variable-length generation up to 6 minutes and full-song composition.
- Stability states outputs are owned by users and commercial use is covered by its Community License for individuals/organisations under $1M annual revenue, subject to the licence/AUP.
- Strong candidate for the primary in-house music runtime, pending local hardware benchmark.

### Stable Audio Open Small — secondary/edge candidate
- 341M parameters.
- Stability says it can run on Arm CPUs and generate up to 11 seconds of audio on a smartphone in under 8 seconds.
- Useful for short sound-design elements, impacts, risers and mobile/edge generation rather than assuming it is the full-song engine.

### MusicGen — research/reference candidate
- Mature text/melody-conditioned architecture.
- Weight licensing is not suitable for our default commercial product path unless the exact applicable licence changes/permits it; keep as benchmark/reference only.

## Video

### Wan 2.2 — primary candidate family to benchmark
- Provides T2V, I2V, text+image-to-video, speech-to-video and Animate variants.
- TI2V-5B supports 720p; I2V/T2V A14B variants target higher capability.
- Particularly interesting for subject-aware image/video generation and character animation.

### HunyuanVideo family — high-quality benchmark candidate
- Open releases include text-to-video, I2V and newer HunyuanVideo-1.5/custom/Avatar work.
- Strong candidate for quality benchmarking, but hardware/inference cost must be measured before selection.

## Decision rule

Do not claim any model is production-ready from documentation alone. Run identical Bikeztagram benchmark prompts and assets, record quality/latency/VRAM/temporal consistency/subject consistency, and separately verify the exact weights licence for the version selected.

## Architecture consequence

Bikeztagram should support multiple model adapters. A local model can be the default where hardware permits; a user-controlled remote worker may be an optional deployment strategy later. The Creative Engine must not depend on one provider.
