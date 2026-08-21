# Generation Runtime Readiness

## Required before integration

- Model identifier and exact version
- Verified capability list
- Local/runtime requirements
- Commercial licence evidence
- Input/output format
- Expected duration and resolution limits
- Failure modes and retry behaviour
- Representative benchmark outputs
- Memory/VRAM measurements

## Integration rule

A model adapter may be implemented before a model is selected, but it must not become the default production provider until benchmark and licensing gates pass.

## Universal test groups

1. Subject animation
2. Multi-subject interaction
3. Environment/world generation
4. Character/object action
5. Story sequence continuity
6. Real + generated media bridge
7. Music generation and revision
8. Music-to-visual event alignment
9. Prompt fidelity
10. Autonomous QA/revision
