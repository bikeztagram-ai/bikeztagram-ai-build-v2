# Bikeztagram AI — AI Music Product Research (2026)

Research basis: Suno, Udio, Soniva, Donna, Mureka and MusicGPT product capabilities visible in current public product/help documentation.

## Product patterns worth adopting

### 1. Start from anything
Support a natural-language brief plus optional:
- lyrics
- humming/melody/audio reference
- image reference
- video reference
- genre/mood/tempo/instrument controls
- instrumental/vocal choice

### 2. Generate multiple candidates
Do not accept the first generation blindly. Generate a small candidate set, score each for creative fit, structure, audio quality, beat clarity and usefulness to the film, then select the best.

### 3. Treat generation as editable
A finished track should support:
- replace selected section
- extend before/after
- crop/remove section
- remix
- style transformation
- lyric replacement
- instrumental/vocal variants
- stem-aware changes
- fade in/out

### 4. Make music a structured timeline
The generated track should expose:
- BPM
- beat grid
- bars/downbeats
- sections
- energy curve
- drops/impacts
- fills/breaks
- intro/build/main/finale boundaries
- optional stem events

The video director consumes this structure so visual changes respond to the actual music rather than merely cutting at arbitrary timestamps.

### 5. Reusable sound identity
Add a first-class Music Persona concept containing genre, mood, vocal character, instrumentation and creative notes. This lets a creator establish a recurring Bikeztagram sound without copying a named artist or copyrighted recording.

### 6. Studio-style workflow
The music UI should eventually behave like a compact creative studio: generation, waveform/timeline, candidate comparison, section editing, stems, extension and export all live in one place.

## Model/runtime strategy

The product should own the orchestration and contracts. A model adapter can point to a local/open runtime where practical. Meta AudioCraft/MusicGen provides open model/runtime research and MusicGen supports text and melody-conditioned generation, but its published model weights are CC-BY-NC, so licensing must be checked before any commercial deployment. Stable Audio Open is useful for short production elements and samples; Stability also advertises open-weights Stable Audio models with longer structured generation, but exact model/license suitability must be verified before integration.

The architecture therefore stays provider/model agnostic and should never hard-code a single external music vendor into the editor.

## What Bikeztagram should add beyond the competitors

The key differentiator is not simply making a good song. Bikeztagram should make the song **for the film**:

1. Analyse the user's media and creative brief.
2. Predict the film's required energy curve.
3. Generate several soundtrack candidates.
4. Analyse the actual winning audio.
5. Align reveals, cuts, transitions and generated scenes to musical structure.
6. If the film is weak, revise the music and/or edit together.
7. Keep all music original and copyright-safe.

## Research-derived feature backlog

- [x] Provider-agnostic music generation request.
- [x] Beat/drop metadata contract.
- [x] Candidate-generation plan.
- [x] Reference audio/image/video fields.
- [x] Music persona contract.
- [x] Section-edit/extend/remix/style request contract.
- [x] Stem-edit request contract.
- [ ] Real local/open model runtime evaluation.
- [ ] Model quality benchmark against current procedural soundtrack.
- [ ] Actual waveform/audio feature extraction from generated tracks.
- [ ] Candidate ranking from audio + creative quality metrics.
- [ ] UI music studio.
- [ ] Music-to-video co-director integration.

## Copyright/safety rule

Use product patterns and engineering concepts, not copied songs, copyrighted lyrics, distinctive melodies, artist impersonation or protected recordings. Named artists can be used as high-level creative references only where legally and technically appropriate; the product should default to original descriptions.
