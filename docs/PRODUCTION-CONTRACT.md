# Bikeztagram AI — Protected Production Contract

## Rule

The production infrastructure contract is **locked**.

No change may rename, remove, weaken, bypass, or silently reinterpret any production storage, AI, upload, deployment, or pipeline setting without an explicit production-contract approval.

This is a standing development rule, not a temporary preference.

## Production services that must remain configured

### Vercel Blob

- Blob storage is part of the core media pipeline.
- Browser uploads use the signed PUT flow through `api/blob-presign.js`.
- The production Blob credential must remain configured in Vercel Production as `BLOB_READ_WRITE_TOKEN`.
- The 500 MB media limit and supported-media validation must not be weakened without explicit approval.
- The signed-upload expiry and pathname scoping must not be removed or silently changed.

### Gemini

- Gemini analysis is part of the core director pipeline.
- The production Gemini credential must remain configured in Vercel Production as `GEMINI_API_KEY`.
- The environment-variable name `GEMINI_API_KEY` is fixed and must not be renamed.
- The application must fail clearly if the production Gemini credential is unavailable; it must never silently fall back to an unauthenticated or different credential.

### Git → Vercel deployment

- Protected `main` is the production release branch.
- `main` must remain enabled for automatic Vercel production deployments.
- Development/parallel branches must remain disabled for automatic production deployment unless explicitly approved.
- We do not manually deploy random feature branches to Production.

## Critical files

Changes to these files are production-contract changes and require explicit approval:

- `vercel.json`
- `api/blob-presign.js`
- `api/upload.js`
- `api/analyse-library.js`
- `api/render.js`
- `.env.example`
- `.github/workflows/production-contract-guard.yml`
- this document

## Pipeline invariant

The expected production path is:

`Browser media → signed Vercel Blob PUT → Blob source library → Gemini analysis → edit plan → renderer → finished video`

A change must not move the project backwards to the previously failing browser client-token upload loop.

## Secrets

Actual secret values must **never** be committed to GitHub, documentation, logs, client JavaScript, or error payloads.

Only the variable names and required environments belong in source control.

## Release rule

Before a production-contract change is merged, verify:

1. Blob upload still completes.
2. Gemini configuration is present in Production.
3. The full source-library analysis path works.
4. The production deployment is using the intended `main` commit.
5. The same regression test that exposed the issue has passed.

If a test fails, fix the underlying issue before continuing the build.
