# Local Generation Runtime Launch Contract

The next experimental milestone is real local inference, not another mock adapter.

## Video runtime
- Accept compiled universal scene request.
- Load a verified local/open video model outside the browser UI.
- Return a generated media record with model/version/runtime metadata.
- Support short clips first; keep resolution and memory bounded.

## Music runtime
- Accept compiled Bikeztagram composition request.
- Generate an original track or section outside the browser UI.
- Return audio plus model/version/runtime metadata and, where available, musical-event metadata.

## Hard gates
- No API keys in client bundles.
- Record model/version/licence evidence.
- Never replace the protected renderer for this experiment.
- Fail clearly when a runtime is unavailable.
- Keep generated outputs reproducible where runtime permits.
