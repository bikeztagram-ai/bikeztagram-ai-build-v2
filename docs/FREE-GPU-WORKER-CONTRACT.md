# Free GPU video worker contract

The cinematic pipeline is £0-only. The Vercel API is an adapter, not the renderer.

## Required endpoints

`GET /health`

- Must respond within 2.5 seconds.
- `2xx` means the worker is reachable and ready.
- JSON is recommended, for example `{ "ready": true, "model": "..." }`.

`POST /generate`

Headers:

- `Content-Type: application/json`
- `X-Bikeztagram-Token: <worker token>`

Body:

```json
{
  "prompt": "cinematic shot prompt",
  "seconds": 4,
  "width": 832,
  "height": 480,
  "referenceAssets": [],
  "continuity": {},
  "shotId": "shot-1",
  "zeroCostOnly": true
}
```

The worker must return an actual video response (`video/mp4`, `video/webm`, etc.). Non-video responses are treated as provider failures.

## Queue rules

1. Never start a later shot while an earlier shot is generating.
2. Cancellation must abort the active request and prevent subsequent shots from starting.
3. A failed shot may be retried once when the failure is transient.
4. A permanently failed shot must leave the manifest resumable rather than pretending the trailer completed.
5. If the worker is not configured or `/health` is not reachable, do not upload references or enqueue generation work.

## Worker selection

The worker can be hosted independently from Vercel. It may use an approved genuinely free GPU runtime/model, but the application must never silently fall back to a paid provider. Any future provider change must preserve this contract and demonstrate a better fit for the cinematic use case before adoption.
