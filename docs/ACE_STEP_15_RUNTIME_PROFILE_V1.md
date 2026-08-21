# ACE-Step 1.5 Runtime Profile

ACE-Step 1.5 is the first music runtime to benchmark through the Bikeztagram Music Studio path.

Observed upstream installation/runtime facts (research snapshot):
- Python 3.11-3.12
- CUDA recommended; MPS/ROCm/Intel XPU/CPU supported
- About 4GB VRAM for DiT-only and 6GB+ for LLM+DiT according to current installation guidance
- Local REST API is available
- Model downloads occur locally on first run
- GPU-aware configurations vary by VRAM tier

Bikeztagram integration rule:
- Do not embed ACE-Step in the browser bundle.
- Treat it as a local worker/runtime.
- Capture exact model/runtime/licence provenance.
- Run the Bikeztagram full-song benchmark before promotion.
- Do not claim quality until actual generated audio is evaluated.

This profile is a benchmark target, not a guarantee of suitability for production.
