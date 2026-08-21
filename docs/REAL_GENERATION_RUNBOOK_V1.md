# Real Generation Runbook V1

## Preconditions
1. Worker health check passes.
2. Runtime/model/version/licence are recorded.
3. Generation budget passes.
4. Required reference media is available.

## Parallel run
- Submit Music A and Music B independently.
- Submit Video A and Video B independently.
- Poll jobs without holding a Vercel request open.
- Normalize results.
- Validate media.
- Evaluate quality and continuity.
- Store evidence bundles.

## Promotion
Only real playable outputs with evidence can enter the experimental creator path. A blocked worker remains blocked; it is never substituted with a fake result.
