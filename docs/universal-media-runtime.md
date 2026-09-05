# Universal media runtime

Generated visuals are first-class production assets. A generated cut must carry a playable media source and provider metadata before it can enter the renderer.

The renderer never substitutes a fake generated-video visual for a missing generation. A missing asset is a controlled failure so the QA/revision layer can retain a valid source or request regeneration.

The creative runtime is provider-neutral: uploaded media, procedural assets and external AI providers share the same media contract. Gemini is excluded from the production architecture.
