# Audio cue intelligence

Bikeztagram AI's free-first original pulse soundtrack now exposes deterministic beat metadata for the editor.

- `createBeatGrid(seconds, bpm, subdivision)` returns stable beat/subdivision timestamps.
- `getMusicCueMarkers(shotDurations, bpm)` maps each shot boundary to its nearest beat.
- The helpers are metadata-only and do not download or embed copyrighted music.
- Invalid duration/BPM/subdivision inputs fail closed with an empty result.

The current renderer/audio contracts remain unchanged. This layer is intended to give future director/timeline work an auditable timing signal for cuts, transitions and emphasis.
