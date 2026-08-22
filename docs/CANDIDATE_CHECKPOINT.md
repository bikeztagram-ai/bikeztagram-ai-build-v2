# Candidate checkpoint

Candidate: `integration/pretest-consolidated-01`

This checkpoint records the deliberate hand-off between development and release testing.

## Development complete when
- Candidate verification suite passes.
- Release-safety verification passes.
- No required changes remain on the candidate branch.
- Protected baseline is recoverable.

## Release boundary
No Vercel deployment is implied by a GitHub commit. Deployment requires an explicit release decision and a fresh quota check.

## Test hand-off
When approved, deploy this candidate once to Vercel and give the resulting deployment URL to the tester. Do not create additional deployments while the test result is being evaluated.
