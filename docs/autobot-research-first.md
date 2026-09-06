# AutoBot research-first engineering contract

## Current evidence

The AutoBot design is intentionally aligned with current autonomous-coding practice:

- **Human merge boundary:** autonomous implementation may create/update a review PR, but must not merge or deploy. Aixgo Code documents the same issue -> implementation -> quality gate -> PR -> human merge boundary.
- **Repository-native quality gate:** autonomous work is only complete after the repository's own verification gate passes. A loop without a real gate is not considered safe completion.
- **Least-privilege Actions:** GitHub recommends least-privilege workflow credentials. AutoBot keeps protected-path guards, explicit no-merge/no-deploy checks, and a draft-PR boundary in addition to branch protection.
- **Non-canceling concurrency:** GitHub Actions concurrency can prevent duplicate work; AutoBot deliberately uses `cancel-in-progress: false` so a long-running build is not silently killed by a later heartbeat.
- **Persistent bounded execution:** long runs are split into bounded hosted segments, with durable checkpoints and a measured runtime-budget state so continuation cannot accidentally reset the elapsed budget.

## Open-source reuse policy

1. Research the current ecosystem before implementing a substantial subsystem.
2. Record candidate projects, licence, maintenance/activity, technical fit, and integration cost.
3. Reuse code only where the licence is compatible with Bikeztagram's distribution model.
4. Prefer adapters and isolated integrations over forks or large copied subsystems.
5. Never copy proprietary code or code with an incompatible licence.
6. Benchmark or contract-test an adopted subsystem before treating it as production-ready.
7. Keep provider-specific AI behind provider-neutral interfaces.
8. Gemini is forbidden in the active product and AutoBot runtime.

## Current autonomous-agent references reviewed

- Aixgo Code — Apache-2.0; issue -> implementation -> repository gate -> draft/review PR -> human merge.
- OpenHands — open-source agent/SDK architecture for repository work and code review; useful as an architectural reference rather than a drop-in dependency.
- GitHub Actions documentation — current workflow security, token, concurrency, and least-privilege guidance.

These references inform architecture and verification. No third-party source code is copied by this document.

## Acceptance rule

A new AutoBot capability is not considered operational merely because a workflow exists. It must have:

- deterministic syntax/contract verification,
- bounded execution,
- durable checkpoint/resume behaviour,
- an authoritative quality gate,
- tamper-evident audit evidence,
- no automatic merge or production deployment,
- and a reviewable draft PR boundary.
