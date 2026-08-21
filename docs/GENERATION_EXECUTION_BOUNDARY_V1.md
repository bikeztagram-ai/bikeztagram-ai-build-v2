# Generation Execution Boundary V1

Heavy generation is intentionally outside Vercel during the experimental phase.

Bikeztagram owns planning, commands, evaluation, provenance and timeline integration. A local generation worker owns model inference. The worker returns actual media and evidence to Bikeztagram.

This boundary must remain model-agnostic so ACE-Step, YuE, video runtimes and future Bikeztagram-owned models can be swapped without rewriting the creative engine.
