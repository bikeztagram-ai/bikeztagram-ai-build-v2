# Bikeztagram AI — Pre-test Candidate

## Integration target

This branch is the consolidation point for the next controlled pre-test candidate. It is based on `integration/creative-engine-pretest-02` and must remain separate from `main` until the candidate passes development verification.

## Required gates

- Creative Engine readiness manifest passes.
- Production build passes.
- Existing release-hardening and batch verification scripts remain available.
- Protected working baseline remains recoverable.
- No Vercel deployment is part of development verification.

## Release rule

This candidate is **not** automatically ready for Vercel. Vercel is only used after the integrated candidate has passed the development gates and the deployment budget has been checked.
