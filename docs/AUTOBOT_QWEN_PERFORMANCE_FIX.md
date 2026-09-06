# AutoBot Qwen performance fix

The first 15-minute autonomous run produced zero completed product objectives because the local Qwen requests timed out at roughly 210 seconds. This checkpoint adds a hosted-runner Ollama proxy and a dedicated fast-brain workflow.

The proxy caps feature calls at 8192 context tokens and 1500 generated tokens, forces deterministic temperature, keeps the model warm, and exposes timing logs. The fast workflow limits feature attempts to one per objective and gives each model call a 120-second budget so failed calls cannot consume most of a short run.

The fix is deliberately isolated from the production app and requires review before merge.
