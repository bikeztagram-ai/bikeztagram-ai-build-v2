# Bikeztagram AI — End-Game Creative Acceptance Matrix

This document defines the quality gate for the finished Bikeztagram AI experience. It is deliberately behaviour-focused: a subsystem is not considered complete merely because its files, schemas, or tests exist.

## 1. Creative brief understanding

A natural-language request must be converted into a structured creative brief containing, where relevant:

- subject and primary focus
- story intent and emotional arc
- visual style and atmosphere
- pacing and intensity
- desired duration/aspect ratio
- music identity, mood, energy and tempo intent
- required reveal, hero moment or ending
- requested generated content
- safety/copyright constraints

Acceptance: materially different briefs produce materially different downstream creative decisions.

## 2. Real-media direction

For uploaded photos/video, the director should:

- rank stronger media above weaker/redundant media
- use media diversity rather than repeating near-identical shots
- understand subject type and action/hero/reveal relevance
- build a coherent hook → build → reveal → action → hero → outro progression when appropriate
- vary shot duration and transitions intentionally
- preserve continuity and prompt intent

Acceptance: changing the brief or available media changes the edit plan in meaningful ways.

## 3. Original music

The music layer should:

- interpret the creative brief rather than produce a generic pulse
- expose musical identity, mood, energy, tempo and instrumentation intent
- support memorable motifs/hooks and a useful structure
- expose trustworthy BPM, beat-grid and section metadata
- allow the director to align edits to meaningful musical events
- analyse actual generated audio when audio is available
- retain an audible deterministic fallback
- clearly distinguish fallback audio from premium/generated audio
- remain copyright-safe and original

Acceptance: two substantially different music briefs must not collapse to the same generic plan.

## 4. Audiovisual synchronisation

Music should materially influence:

- cut timing
- section changes
- transitions
- reveals
- action peaks
- hero moments
- endings

Acceptance: the edit remains sensible without metadata, but becomes measurably more deliberate when reliable musical metadata exists.

## 5. Cinematic rendering

The renderer should support, where the media allows:

- intelligent reframing/cropping
- smooth zoom and pan
- shot-specific motion
- speed changes or ramps
- purposeful transition variation
- cinematic colour treatment
- restrained text overlays
- reliable audio continuity
- social-safe framing

Acceptance: output is not merely a sequence of concatenated clips; the render visibly reflects the director's decisions.

## 6. Original generated scenes

For photo/prompt-driven generation, the architecture must preserve:

- supplied subject identity
- motorcycle/object identity and continuity
- plausible camera language and motion
- lighting and environment consistency
- temporal continuity
- prompt-specific scene intent
- original-world generation rather than direct reproduction of protected game assets, characters, logos or distinctive maps

Example acceptance brief:

> Use my supplied photo and motorcycle as the subject of an original open-world crime/action-game-inspired cinematic chase scene. Preserve my appearance and the bike, use a dramatic night-time city environment, build tension, then reveal the bike in a hero shot.

The system must interpret the request without falsely claiming to have generated capabilities that the configured provider does not support.

## 7. Full pipeline

The intended production path is:

`creative brief → media profiling → director → music → beat-aware edit plan → optional generated scenes → renderer → final validation/export`

Acceptance: representative motorcycle briefs and generated-scene briefs complete this path without silently bypassing major creative decisions.

## 8. Failure behaviour

When an external AI/music/generation provider is unavailable:

- preserve the working render path where possible
- use deterministic safety fallbacks where appropriate
- surface the limitation honestly
- never label a procedural fallback as equivalent to a professional generated result
- never corrupt or silently discard user media

## 9. Quality gate rule

A batch should only be considered complete when it has made substantive production improvements and its claims are backed by behavioural verification or a documented external-provider limitation.

Passing unit/schema checks alone is insufficient.

## 10. Product philosophy

The finished product should feel like an AI creative director, not a template picker. Every major decision should answer one question:

**Does this help turn the user's creative intention into a better finished film?**

If a change adds complexity without improving that outcome, it should not be accepted merely because it increases code coverage or feature count.
