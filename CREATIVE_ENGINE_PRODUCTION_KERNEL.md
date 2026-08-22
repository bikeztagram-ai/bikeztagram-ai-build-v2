# Creative Engine Production Kernel

This batch defines the provider-agnostic production spine for Bikeztagram AI.

## Pipeline

Natural-language request + uploaded assets → understand → analyse media → direct → compose original music → generate scenes → assemble → render → quality → bounded revision → export.

## Provider strategy

Required stages must remain executable without optional external providers. Music falls back to procedural original generation; video generation falls back to the in-house procedural scene generator; direction can fall back to local heuristics; rendering remains browser-based; QA remains local.

## Long-term upgrade path

Open/local model runtimes can be attached to the provider slots without changing the production job schema or downstream renderer contracts.

## Safety boundary

Creative generation is original and provider-neutral. Named copyrighted works are not treated as templates to imitate. Licensed replacement tracks remain a separate workflow from original generation.
