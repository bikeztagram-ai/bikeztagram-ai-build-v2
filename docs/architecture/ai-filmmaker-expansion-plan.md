# Bikeztagram AI — Parallel Expansion Plan

## Purpose

Define implementation-ready work that can proceed alongside autonomous builder batches without modifying files owned by an active batch.

## Core pipeline

User idea → safety/rights gate → creative brief → reference board → media intelligence → storyboard → provider/model routing → generation/editing → music direction → AV synchronisation → shot-level QC → targeted regeneration → provenance → export.

## Reference Board

Treat references as typed assets rather than an undifferentiated image list:

- person / likeness
- vehicle / product / object
- wardrobe / styling
- environment / location
- composition / framing
- motion / performance
- source video
- audio / voice / music

Every reference gets an explicit role and persistence requirement. The director should decide which references are hard constraints versus inspiration.

Current industry direction supports this architecture: multimodal systems increasingly combine multiple image/video/audio references and multi-shot generation, while research shows that identity/world memory and beat-aware boundaries are important for coherent sequences. 

## Creative brief compiler

Convert natural-language requests into a structured brief containing:

- intent and audience
- story arc
- subject identities
- world/environment
- visual language
- shot requirements
- camera language
- motion requirements
- music identity
- audio events
- duration/aspect ratio/platform
- safety/rights decision
- generation/editing strategy

The compiler must preserve user intent while removing or transforming protected-expression requests when necessary.

## Universal generation strategy

Do not hard-code GTA, film or game-specific generators. Support an abstract scene language capable of describing original:

- action
- racing
- sci-fi
- fantasy
- horror
- animation
- noir
- documentary-like
- music-video
- historical
- futuristic
- completely original worlds

Protected references are converted to high-level creative attributes where exact reproduction would create rights risk.

## Model/provider routing

Use adapters so providers can be swapped without changing the director. Route by task characteristics:

- identity/reference-heavy
- motion/action-heavy
- dialogue/lip-sync
- environment/world creation
- image-to-video
- video-to-video
- fast draft
- final-quality render

Provider capability metadata should include supported inputs, duration, resolution, native audio, reference limits, cost class, safety constraints and reliability.

## Music and AV intelligence

Represent music as structured sections/events, not only a waveform:

intro, tension, build, transition, drop, development, climax, resolution.

Extract beat/onset/energy/section events and expose them to the director. Recent research shows fine-grained audio-visual alignment benefits from temporal audio features rather than simple beat cutting, and multi-shot research highlights beat signals at shot boundaries.

## Shot-level regeneration

Persist an immutable project plan plus per-shot dependencies. A user or QC evaluator should be able to regenerate one weak shot while preserving:

- approved references
- character/object identity
- world state
- music timing
- neighbouring shot continuity
- approved creative intent

Only dependent downstream artifacts should be invalidated.

## Quality evaluator

Score each shot and the full sequence on:

1. brief adherence
2. reference identity
3. world/lighting continuity
4. motion/physics plausibility
5. composition/camera quality
6. narrative/pacing quality
7. music/AV synchronisation
8. artefacts/failure signals
9. safety/rights compliance

Use thresholds to choose KEEP, REGENERATE, TRANSFORM, or BLOCK. Human review remains the final authority for launch-quality output.

## Safety and rights

Use layered controls:

keyword/rule screening → contextual safety classifier → rights/likeness analysis → ALLOW / TRANSFORM / BLOCK → generation → output check.

Do not rely on banned words alone. Keep safety policy data/config separate from creative code so it can be updated independently.

## Provenance

Generated outputs should carry appropriate provenance/AI-disclosure metadata where supported. Preserve an internal generation record linking project, references, model/provider, prompt/brief version, safety decision and output artifact without retaining unnecessary personal data.

## Account and abuse architecture

Generation should ultimately require an account. Separate ordinary product identity from high-risk verification. Maintain privacy-conscious audit records sufficient for abuse prevention, security investigations and lawful requests. Define retention and access rules before commercial launch.

## Parallel development rule

When an autonomous batch owns product files, parallel work must use:

- documentation/research files
- isolated architecture branches
- independent test fixtures
- non-overlapping utilities

Never modify an active batch's files without an explicit handoff.

## Research-derived priorities

1. Multimodal reference board
2. Creative brief compiler
3. Provider capability registry/router
4. Audio/beat/section event contract
5. Shot-level regeneration contract
6. Behavioural quality evaluator
7. Safety/rights gate
8. Provenance and audit model
9. Account/project architecture
10. End-to-end acceptance suite
