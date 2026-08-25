# Bikeztagram AI — AI Filmmaker Architecture v1

## Purpose

Define the product-level architecture for turning a user's creative idea into a safe, high-quality finished video while allowing autonomous builder batches to implement isolated subsystems without changing the end goal.

## Core pipeline

1. **User intent** — natural-language creative brief plus optional photos, videos, audio and references.
2. **Rights & safety gate** — classify the request as ALLOW, TRANSFORM, or BLOCK. Check copyright/IP, likeness/consent, illegal/harmful content, provider restrictions and obvious banned/high-risk terms. Never rely on keywords alone.
3. **Creative brief compiler** — convert the user's request into structured intent: subject, story, emotion, genre, visual language, pacing, setting, references, music brief, duration, aspect ratio and output target.
4. **Media intelligence** — analyse uploaded media and identify the strongest usable shots, subjects, objects, continuity constraints, audio and missing coverage.
5. **Storyboard / shot plan** — create a coherent sequence with hook, setup, escalation, reveal, action/climax and ending where appropriate. Each shot declares purpose, subject, camera, motion, duration, transition, visual treatment and generation/edit source.
6. **Generation planner** — decide which shots can use user media, which need transformation/editing and which need original generated media. Preserve subject/object identity across generated shots.
7. **Music director** — create or select rights-safe/original music appropriate to the brief; expose BPM, beats, sections, energy, hooks, drops and climax markers to the editor.
8. **AV synchronisation** — map cuts, transitions, camera intensity, motion and visual peaks to meaningful musical events rather than only elapsed time.
9. **Renderer** — execute the shot plan with reframing, pans/zooms, speed changes, transitions, colour, audio mix and generation outputs.
10. **Quality gate** — inspect the result against behavioural acceptance criteria. If one component is weak, regenerate/revise that component rather than restarting the entire project.
11. **Provenance / export** — preserve applicable Content Credentials/provenance metadata, disclose AI generation where required, and export platform-specific deliverables.

## Creative transformation rule

Users may ask for a film, game, TV or other recognizable creative reference. The system should preserve legitimate high-level intent (genre, mood, pacing, cinematography, setting concepts and creative goals) while refusing or transforming requests that would reproduce protected expression, assets, footage or characters inappropriately. The system should not promise that every requested use is legal.

Example:

- Request: "Put me into a GTA-style night motorcycle chase."
- Safe brief: "Place the user and their motorcycle in an original open-world crime-action city at night, with wet streets, pursuit energy, cinematic tracking shots and an original soundtrack. Do not reproduce GTA assets, map, characters, logos or exact scenes."

## Reference-media strategy

Support multiple reference types independently and in combination:

- person/identity reference
- vehicle/object reference
- environment/reference image
- composition reference
- motion reference
- colour/lighting reference
- uploaded video
- audio/music reference

Every generated shot should declare which references are authoritative and which characteristics must remain stable. The architecture should allow provider-specific adapters so stronger future models can be introduced without redesigning the creative pipeline.

## Regeneration strategy

A finished project must be addressable at shot/component level. A user should be able to say:

> "Change shot 3 to a lower, faster tracking shot and make the reveal bigger."

The system should preserve the approved project plan, regenerate only affected components, then re-render the final sequence.

## Safety architecture

Safety is a pipeline, not a single filter:

`prompt/rules -> context classifier -> rights/likeness checks -> creative brief -> generation prompt -> output check -> export`

Maintain an updateable ruleset for high-risk terms and patterns, but use contextual classification to avoid crude false positives. Record safety decisions for authenticated users according to a documented retention/privacy policy.

## Provenance architecture

Where technically feasible, generated/edited exports should preserve or create machine-readable provenance using appropriate open standards such as C2PA Content Credentials. Provenance is an origin/history signal, not proof that content is truthful or legally owned.

## Competitive feature principles

Research indicates that strong systems increasingly combine reference-guided generation, audio-aware editing, beat/section analysis, prompt-driven workflows, targeted regeneration and provenance. Bikeztagram should integrate these as one coherent creative-director workflow instead of exposing disconnected specialist tools.

## Quality bar

A feature is not complete because its API returns successfully or a plan JSON exists. It is complete when a representative user request produces a coherent, visually intentional, musically appropriate, legally safer and repeatably usable result, with failures isolated and recoverable.
