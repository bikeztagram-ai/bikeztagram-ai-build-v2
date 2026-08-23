# Recovery approval

The current user explicitly authorised restoration of the known-good Blob/Gemini production contract before continuing with the new public Blob store integration.

This commit carries the required `[production-contract-approved]` marker in its commit subject so the repository guard can distinguish the deliberate recovery from an accidental protected-file change.
