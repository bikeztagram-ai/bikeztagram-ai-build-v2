# AutoBot Builder Capability Roadmap

The objective is for AutoBot to become the primary autonomous engineering worker for Bikeztagram AI, with ChatGPT acting as architect/reviewer when needed.

## Capability ladder

1. **Implement** — understand an objective and make real production changes.
2. **Verify** — build and exercise observable behaviour, not just syntax.
3. **Repair** — diagnose failures and make bounded corrective attempts.
4. **Plan** — decompose a product objective into dependent implementation units.
5. **Remember** — use verified history, failures and lessons to improve future work.
6. **Evaluate itself** — measure throughput, failure classes, recovery rate and product-quality evidence.
7. **Improve itself** — propose and test bounded improvements in isolated branches.
8. **Choose work intelligently** — prioritise high-value unfinished product objectives and dependencies.
9. **Operate unattended** — sustain useful work for the requested time budget and leave clean checkpoints.

## Success definition

AutoBot is not considered production-capable merely because it completes many passes. It must repeatedly produce substantive Bikeztagram improvements that:

- affect the real user-facing runtime when required;
- preserve existing working contracts;
- pass build and targeted verification;
- survive self-review and repair when necessary;
- produce auditable evidence;
- improve measured builder performance over time without weakening quality or security gates.

## Self-improvement boundary

AutoBot may improve planning, task ordering, prompts, diagnostics, recovery, evidence and efficiency through isolated experiments. Changes to workflow security, permissions, secrets, protected paths, automatic merge/deploy behaviour, or quality-gate strength remain human-review-only.

## Operating principle

Do not optimize for activity. Optimize for **verified product value per unattended hour**.
