# Autonomous Builder Provider Boundary

## Current architecture

- **Autonomous engineering worker:** OpenAI Codex CLI, invoked by `.github/workflows/autonomous-builder.yml`.
- **Engineering model:** configured by `BUILDER_AGENT_MODEL` in the workflow; the current bounded worker uses `gpt-5.6-terra`.
- **Engineering credential:** `OPENAI_API_KEY` GitHub Actions repository secret.
- **Quality authority:** deterministic GitHub Actions verification (`npm run build`, `npm run verify:batch76`, and `npm run verify:pro-song`) plus the normal PR review/checks.
- **Release control:** no automatic merge to `main` and no automatic production deployment from the builder.

## Product AI is separate

The Bikeztagram application still contains Gemini-backed product capabilities where they are part of the runtime product architecture. The Codex migration applies to the **engineering/build agent**, not automatically to the user's video-generation or director provider.

This separation is deliberate: a temporary quota or availability issue in the engineering agent must not force a product-provider migration, and product Gemini credentials must not be required just to run the autonomous engineering worker.

## Retired builder components

The old Gemini-based autonomous control-plane workflow and Gemini-specific builder reviewer/launcher files were retired. Historical batch records may still mention Gemini because they describe what happened at that time; those historical descriptions are not active execution paths.

## Queue migration

Batch 90 was closed without merging because it was produced under the retired Gemini builder loop. Batch 91 is the Codex-based rebuild of the same substantive end-to-end product objective, starting from the current `main` state.
