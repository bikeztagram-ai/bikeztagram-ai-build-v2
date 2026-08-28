# Autonomous Builder Provider Boundary

## Current architecture

- **Autonomous engineering worker:** OpenAI Codex CLI in non-interactive execution mode.
- **Engineering model:** `gpt-5.3-codex` by default, configurable with `BUILDER_CODEX_MODEL`.
- **Engineering credential:** `OPENAI_API_KEY` GitHub Actions repository secret.
- **Quality authority:** deterministic verification plus normal PR review/checks.
- **Release control:** no automatic merge to `main` and no automatic production deployment from the builder.

## Provider boundary

The autonomous builder is now explicitly OpenAI-only. The runner rejects runs without `OPENAI_API_KEY` and does not accept or invoke Gemini credentials. `BUILDER_AGENT_CMD` remains available as an explicit override for controlled testing, but the default worker is OpenAI Codex.

Codex runs non-interactively inside the Vercel Sandbox with workspace-write access to the isolated working branch. The runner owns Git commit/push, verification, protected-path restoration and release boundaries.

## Product AI is separate

The autonomous engineering provider is independent from Bikeztagram's product-side AI/runtime integrations. Changing the engineering worker does not change product AI behaviour.

## Quality and safety constraints

- Up to eight bounded engineering passes per batch.
- Verification is required before a batch is published for review.
- `.github/workflows/**` remains protected during product batches.
- No automatic merge to `main`.
- No automatic production deployment.
- OpenAI authentication, quota and model failures stop the batch rather than creating an uncontrolled retry loop.
