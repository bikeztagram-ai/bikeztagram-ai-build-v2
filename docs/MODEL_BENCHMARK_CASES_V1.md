# Model Benchmark Cases V1

## Music

### M1 — Cinematic motorcycle trailer
Prompt: dark cinematic hybrid electronic/rock, 15 seconds, mysterious intro, escalating tension, major drop at ~6 seconds, driving section, final impact and clean ending.

Measure: prompt adherence, musical coherence, drop impact, beat/section structure, loudness, artefacts, generation time, VRAM.

### M2 — Image-conditioned mood
Input: motorcycle image.
Prompt: infer an original soundtrack mood from the visual without copying a named artist/song.

Measure: visual-to-musical relevance and consistency.

### M3 — Revision
Generate M1, then request: "make the drop bigger, darker and more aggressive while preserving the intro and ending."

Measure: local edit quality and preservation.

## Video

### V1 — Bike image-to-video
Input: motorcycle image.
Prompt: cinematic tracking shot, bike moves naturally, camera follows, preserve identity and proportions.

Measure: subject consistency, motion, temporal stability, prompt adherence.

### V2 — Person + bike scene
Inputs: person image + bike image.
Prompt: fictional open-world cinematic scene, person approaches bike, mounts and rides away; no copyrighted franchise imitation.

Measure: identity consistency, interaction plausibility, camera direction, temporal stability.

### V3 — Generated bridge
Two real clips with a narrative gap. Generate a 2–4 second bridge that matches lighting, subject and motion direction.

Measure: continuity and transition quality.

### V4 — Creative scene
Text-only request for a fully original game-like cinematic world.

Measure: prompt fidelity, composition, motion, temporal stability.

## Selection rule
No winner is selected from marketing claims. Results must include repeatable settings, hardware, generation time, memory pressure, output samples and licence status.
