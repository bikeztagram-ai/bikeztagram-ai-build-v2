# Universal media runtime

Bikeztagram AI treats generated media as a first-class production asset rather than a visual placeholder.

## Contract

Every generated visual must carry a playable media source plus provider metadata. The renderer must consume that playable source exactly like uploaded video, while preserving creative-intent metadata for direction, continuity and QA.

Provider adapters remain replaceable. The production runtime must never depend on Gemini.

## Quality rule

A missing generated source is a failed generation, not permission to substitute a fake generated-video visual. The pipeline should retain the original source or surface a controlled generation failure so QA can reject the result.
