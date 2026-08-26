# Autonomous Builder Provider Boundary

## Current architecture

- **Autonomous engineering worker:** Google Gemini CLI through the free API tier.
- **Engineering model:** selected by Gemini CLI; the workflow intentionally does not pin a paid OpenAI model.
- **Engineering credential:** `GEMINI_API_KEY` GitHub Actions repository secret.
- **Quality authority:** deterministic GitHub Actions verification (`npm run build`, `npm run verify:batch76`, and `npm run verify:pro-song`) plus the normal PR review/checks.
- **Release control:** no automatic merge to `main` and no automatic production deployment from the builder.

## Provider-neutral runner boundary

The task-driven runner predates provider-neutral credentials and currently receives its agent credential through the legacy `OPENAI_API_KEY` environment slot. The workflow maps the `GEMINI_API_KEY` secret into that runtime slot solely for the generic runner interface, then the Gemini CLI process receives it as `GEMINI_API_KEY`. No OpenAI API request is made by the autonomous builder.

This compatibility layer is temporary and deliberately isolated to the workflow; it does not change the product's OpenAI/Gemini integrations.

## Product AI is separate

Bikeztagram's product-side Gemini capabilities remain independent. Changing the autonomous engineering worker must not alter the application's AI provider or runtime behaviour.

## Cost and safety constraints

- No OpenAI API credits are required for autonomous builder runs.
- Builder passes are bounded.
- Vercel Sandbox execution remains bounded by the workflow timeout.
- Provider quota/auth failures stop the batch instead of creating an uncontrolled retry loop.
- No automatic merge to `main`.
- No automatic production deployment.
