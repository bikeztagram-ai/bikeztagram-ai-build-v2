# Recovery audit — 2026-08-23

This branch is intentionally anchored to commit `01818773494f94cdd398a51b0f0f7ca75fe0ceef`, the last tree immediately before PR #198/#199 changed the Blob reader on `main`.

## Findings
- `main` currently contains PR #198 and PR #199, so it is not identical to the recovery tree.
- The recent dedicated public Blob work is isolated on `fix/public-blob-gemini-v2` / `fix/public-blob-client-v3`; it is not part of this recovery tree.
- Vercel currently lists one project connected to this repository: `bikeztagram-ai-build-v2`.
- The current Vercel preview history shows both the older private Blob store host and the newly introduced public Blob store host. These must not be mixed.
- The recovery branch must not be deployed directly to production. It exists to establish a clean comparison point before the next controlled Blob/Gemini test.

## Rule
Do not merge or deploy experimental Blob-store changes into this recovery branch. First verify the existing Blob/Gemini contract from this tree, then create one isolated, minimal public-store candidate if required.
