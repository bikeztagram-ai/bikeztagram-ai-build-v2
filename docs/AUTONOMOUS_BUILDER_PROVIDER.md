# Autonomous Builder Provider Boundary

## Current architecture

- **Autonomous engineering worker:** local Ollama coding model.
- **Engineering model:** `qwen2.5-coder:3b` by default, configurable with `LOCAL_AI_MODEL`.
- **Engineering credential:** none; the model runs locally on the builder host.
- **Quality authority:** deterministic verification plus normal PR review/checks.
- **Release control:** no automatic merge to `main` and no automatic production deployment from the builder.

## Provider boundary

The autonomous builder is explicitly local-only. The runner requires `LOCAL_AI_READY=1` before invoking the feature brain and refuses paid-provider fallback. Gemini, OpenAI/Codex and other hosted engineering providers are not part of the AutoBot execution path.

The local engineer works only on isolated builder branches and only within the files declared by the selected product objective. The runner owns Git publishing, verification, protected-path enforcement and release boundaries.

## Product AI is separate

The autonomous engineering worker is independent from Bikeztagram's product-side AI/runtime integrations. Changing the engineering worker does not change product AI behaviour.

## Quality and safety constraints

- Work is bounded by the requested runtime and feature-pass limits.
- Verification is required before work is treated as successful.
- `.github/workflows/**`, builder security/quality controls and release boundaries remain protected.
- No automatic merge to `main`.
- No automatic production deployment.
- Local-model unavailability stops the builder rather than silently switching to a paid provider.

## Long-term direction

The builder should improve its planning, diagnostics, recovery, prioritisation and engineering efficiency from verified historical evidence. Self-improvement remains isolated and reviewable; it must never weaken the quality or security boundaries that judge the builder itself.
