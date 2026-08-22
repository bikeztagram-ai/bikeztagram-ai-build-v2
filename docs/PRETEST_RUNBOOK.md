# Controlled Pre-test Runbook

1. Keep all development on integration branches; do not use `main` as a scratchpad.
2. Run the Creative Engine readiness verification.
3. Run the production build.
4. Review existing batch verification coverage before selecting the candidate.
5. Confirm the protected baseline remains recoverable.
6. Confirm the candidate contains only the intended integrated batch.
7. Check current Vercel deployment allowance immediately before deployment.
8. Deploy to Vercel once, deliberately, only after all development gates pass.
9. Give the tester the resulting deployment URL.
10. Record the test result before any further deployment.

Development commits are not themselves permission to deploy. A Vercel deployment is an explicit release/test action.
