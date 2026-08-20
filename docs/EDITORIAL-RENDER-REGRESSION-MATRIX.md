# Editorial Render Regression Matrix

## Real footage
- Uploaded footage remains the primary media source.
- Generated/procedural scenes require explicit opt-in.
- Shot order follows the editorial plan.

## Motion
- Static is the safe default.
- Explicit camera movement may be preserved.
- Artificial motion is restrained and purposeful.

## Timing
- Cut duration is clamped to usable source duration.
- Playback rate is included in usable-duration calculations.
- The renderer must not hold the final source frame to fill a cut.

## Transitions
- Clean cuts/crossfades are the default.
- Aggressive effects require an explicit plan decision.
