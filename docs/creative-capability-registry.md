# Creative capability registry

Bikeztagram AI is built around a provider-neutral capability registry so new creative abilities can be added without rewriting the editor.

Core capability families:

- creative intent and brief interpretation
- scene/world construction
- subject and asset generation
- camera direction and continuity
- timeline and edit decisions
- transitions, compositing and effects
- music, vocals and sound design
- render backends and output presets
- quality criticism and automatic revision

Each capability should expose a stable contract, retain provider metadata, and degrade safely when an external provider is unavailable. Provider integrations are adapters, not the product's creative model. Gemini is excluded from the production architecture.

The target is broad creative coverage: a user should be able to describe an original idea in natural language and the runtime should map that intent to the strongest available combination of generated assets, uploaded assets, procedural techniques, AI providers and deterministic editing.
