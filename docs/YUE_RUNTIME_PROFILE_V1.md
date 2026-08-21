# YuE Runtime Profile

YuE remains the second full-song music runtime benchmark.

Observed upstream installation/runtime facts (research snapshot):
- Python >=3.8 is recommended by the upstream repository
- CUDA >=11.8 is used in the documented setup
- FlashAttention 2 is required/recommended for practical long-sequence inference to reduce OOM risk
- Full-song generation is assembled from lyric sections/segments
- GPU memory availability affects segment/batch settings

Bikeztagram integration rule:
- Keep YuE behind the local music-worker contract.
- Capture exact model/runtime/licence provenance.
- Benchmark against the same creative briefs as ACE-Step.
- Do not select it based on demos alone.
