# Bikeztagram AI — Autonomous Builder End-Game Specification

## Product destination
Bikeztagram AI is intended to become a production-grade AI creative director and cinematic video creation system for motorcycle/social creators. It must edit real uploaded photos/video and, over time, create original cinematic scenes/clips from photos and prompts. A user should be able to describe the desired result in natural language and have the system interpret that request as a production brief, analyse available media, direct the sequence, create or select an original soundtrack, synchronise picture and sound, render the finished social-ready video, and provide a strong final result without requiring manual editing expertise.

## Quality bar
The target is not a minimum-compliance editor. Every subsystem should be designed so that the implementation can remain part of the eventual finished architecture. Do not use labels such as "production-grade" or "studio-master" as substitutes for actual behaviour.

The AI director should produce deliberate creative decisions: strongest-shot selection, diversity, narrative structure, pacing, framing/cropping, motion, zoom/pan, speed/ramping, transitions, colour treatment, restrained text, music selection, beat/energy synchronisation, continuity and a satisfying ending. It should interpret the user's prompt rather than applying one generic template to every project.

The music system should aim for genuinely exciting, memorable, original and copyright-safe music. It should support musical identity, hooks, structure, builds, drops/reveals, emotional energy, tempo/beat/section metadata, intelligible timing and reliable integration with the edit. A fallback must remain audible and deterministic, but a procedural fallback must not be represented as equivalent to a professional generated track.

## Generated-scene direction
The long-term creation engine must support original generated scenes/clips from photos and prompts. Example target: a user can provide a photo of themselves and their motorcycle and request an original open-world crime/action-game-inspired cinematic scene. The system should preserve subject identity, physical continuity, plausible camera/motion, lighting and world consistency while avoiding direct reproduction of protected game assets or copyrighted characters/worlds.

## Autonomous batch specification standard
Every product batch supplied to the autonomous builder is an implementation specification, not a vague feature request. Before a batch is executed, its objective must explicitly define:

- **Outcome:** the concrete user/product capability that must exist when the batch is complete.
- **Behaviour:** how the capability should make decisions and behave across representative inputs, including meaningful differences between different creative briefs where applicable.
- **Implementation direction:** which existing systems/contracts should be inspected and how the new capability should integrate with them without unnecessary rewrites.
- **Quality bar:** what professional/end-game behaviour looks like in this specific feature; passing a schema check or adding a helper function is not sufficient evidence.
- **Constraints and non-goals:** what must remain intact, what must not be invented, and what infrastructure is out of scope.
- **Acceptance scenarios:** concrete behavioural scenarios that demonstrate the intended capability rather than merely proving that functions execute.
- **Regression protection:** existing contracts and important behaviour that must continue to work.
- **Completion evidence:** the builder must verify the actual production behaviour and must not claim completion solely because tests pass or code compiles.

The builder should implement the full intended outcome rather than selecting the narrowest technically valid subset. If the objective requires creative or behavioural intelligence, verification must demonstrate that intelligence through representative contrasting inputs/briefs, not only fixed happy-path assertions. The objective is to make one coherent, durable improvement toward the end-game product, not to accumulate superficial feature labels.

## Engineering rules
- Inspect existing code and contracts before changing them.
- Preserve working Blob upload/read, Gemini/director failover, renderer, PWA and existing generation behaviour unless the batch specifically improves them.
- Prefer incremental improvements that fit the eventual architecture.
- Do not rebuild working systems merely to rename or restate them.
- Production code must improve; tests alone are not a completed product batch.
- Every claimed capability must have behavioural verification where practical.
- Use check → fix → check → continue inside each bounded batch.
- Independent safe work may be performed in parallel.
- Never modify `.github/workflows/**` or autonomous-runner infrastructure from a product batch.
- No automatic merge, production deployment or paid infrastructure provisioning.

## Current development priority
After Batch 82's foundation work, the next priority is to turn the director foundations into real creative decision-making rather than generic shot mapping. The next batch should improve the existing director in place: prompt interpretation, media ranking, shot diversity, story beats, shot durations, transition selection, motion decisions, reveal/hero/outro logic, and music-aware timing. It should use the new media profiling rather than bypassing it. It should also add verification that checks the resulting plan for meaningful variation and prompt-specific decisions instead of only checking that fields exist.
