# Bikeztagram AI — Persistent Project Memory

This file is durable project context loaded by every autonomous builder batch. The builder must still inspect the current repository before coding.

## Product north star
Bikeztagram AI is a high-quality, Android-friendly cinematic creator. The long-term product is an AI creative director that understands a natural-language brief, intelligently edits real uploaded media, generates original scenes where supported, creates original music, synchronises picture and sound, renders social-ready videos, and provides truthful fallbacks when premium providers are unavailable.

## Core principles
- Local-first where practical; do not require paid AI APIs for basic operation.
- Generated content must be original and copyright-safe; do not reproduce protected game, film, TV or animation assets.
- Never claim unavailable provider capability; expose useful deterministic fallbacks.
- Preserve working real-media editing and browser/FFmpeg rendering.
- Creative briefs must materially influence results.
- Prefer strongest-shot selection, diversity, story structure, musical timing and purposeful cinematic motion over arbitrary effects.
- New capabilities must reach the real user-facing runtime path when required.
- Green tests are necessary but not sufficient evidence of product quality.

## Current state
- React/Vite browser application with local media handling and browser rendering.
- Core systems include media profiling/intake, director/edit planning, original music generation/analysis, beat-aware timing, captions, social export and procedural original-scene generation.
- Gemini CLI is the bounded autonomous engineering worker.
- AutoBot uses `config/autonomous-builder-queue.json` and batch-specific branches/PRs.
- `builder/quality/lessons.md` contains detailed lessons and must be read before every batch.
- Builder reports/checkpoints provide historical evidence.

## Every-batch operating model
1. Load this memory and `builder/quality/lessons.md`.
2. Inspect the current repository and relevant production paths.
3. Translate the queue objective into a precise implementation plan.
4. Make substantive production-code changes in the intended runtime path.
5. Use check-fix-check-continue rather than stopping at the first green check.
6. Prove observable behaviour, preferably end-to-end.
7. Record reusable lessons discovered during the batch.
8. Produce a reviewable PR; never merge automatically.

## Prompt-quality rules
When output is technically correct but product-poor, future objectives must become more precise about user-visible behaviour, relevant files and integration points, production changes, protected areas, representative/contrasting scenarios, acceptance evidence and known failed approaches. Do not merely make prompts longer; ground them in the current repository.

## Durable lessons
- Planner/director work is incomplete if the renderer does not consume it.
- Music work must be judged by audible output and actual timing influence, not metadata alone.
- Generated-scene work must remain truthful about provider capability and copyright-safe output.
- Integration quality is more important than isolated feature sprawl.
- Rejected/closed batches are evidence; do not repeat the same implementation pattern without addressing why it failed.

## Review backlog
Completed/open review PRs are durable work storage and must not block later eligible batches. Human review is separate from queue progression. Rejected batches must record why they were rejected so the queue can advance without losing the lesson.

## Priority
Continue toward an integrated end-to-end creative workflow. Prioritise production behaviour and integration gaps over cosmetic/documentation-only work.

## Maintenance
Update this memory or `builder/quality/lessons.md` when a batch produces a durable architectural/product lesson. Never store secrets or transient chat details here.
