# Creative Engine Integration Order

The parallel branches are deliberately isolated. Merge only after each candidate verifies cleanly.

## Integration waves

### Wave 1 — contracts
- Creative Director / creative job contracts
- Music generation/studio contracts
- Video generation contracts
- Subject identity manifest
- Model capability registry

### Wave 2 — runtime intelligence
- Music runtime + actual audio analysis adapter
- Video generation runtime adapters
- Creative orchestration
- Resumable job state
- Generation budget/safety policy

### Wave 3 — editorial intelligence
- Beat/drop event map
- Music-to-video co-direction
- Creative QA
- Autonomous bounded revision

### Wave 4 — product experience
- Natural-language creative brief UI
- Music studio UI
- Generated-scene controls
- Subject/asset manager
- Job progress/resume UI

### Wave 5 — real model evaluation
- Benchmark candidate local/open music runtimes.
- Benchmark candidate local/open video runtimes.
- Verify commercial licences before enabling any model.
- Measure quality, speed, memory, hardware requirements and output consistency.

### Wave 6 — protected integration
- Integrate only verified waves into `dev/ai-filmmaker-batch-v2`.
- Run full existing verification suite.
- Run real-device media tests.
- Preserve the protected renderer/Blob/Gemini contracts.
- No production deployment until the integrated candidate passes real acceptance.

## Rule
Architecture can be built now; model selection and heavy runtime dependencies must be evidence-led. Never pretend a contract is a working generator until a real runtime has produced and been analysed on representative media.