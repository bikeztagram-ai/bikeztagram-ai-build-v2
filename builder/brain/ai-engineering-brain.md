# Bikeztagram AI — AI Engineering Brain

The autonomous builder now has an optional reasoning layer backed by Gemini. The AI brain is an **advisory planner**, not an unrestricted code executor.

## Responsibilities

- Read durable Bikeztagram project context before each sustained run.
- Identify the highest-value unfinished engineering work.
- Detect no-op, low-yield and premature-run patterns from self-improvement evidence.
- Propose concrete, buildable objectives with acceptance criteria and likely files.
- Surface blockers and architectural risks.
- Preserve the protected working baseline and safety boundaries.

## Authority model

The AI brain can recommend work; deterministic implementation, verification, protected-path rules and PR review remain authoritative.

This separation is deliberate: a capable model should improve prioritisation and reasoning without being allowed to silently rewrite repository safety controls.

## Model

The default model is `gemini-3.7-flash`, selected for coding and agentic workflows. If the Gemini key is unavailable or the API fails, the builder writes a deterministic fallback plan and continues safely.

## Output

The brain writes `builder/brain/ai-engineering-plan.json`. The plan is bounded to five priorities and includes acceptance criteria, risks, blockers and guardrails.

The next phase is to make the deterministic executor consume this plan when replenishing its production backlog, so the AI recommendation directly influences what the builder builds next.
