# Autonomous Builder Runner

The runner executes exactly one bounded development batch in an ephemeral Vercel Sandbox.

## Safety contract

- Base branch: `main`
- Work branch: dedicated `autonomous-builder/<batch-id>` branch
- Sandbox: non-persistent
- Maximum first-run duration: 60 minutes
- Keep Alive: off
- Automatic merge: off
- Production deployment: off
- New paid storage provisioning: off
- Build and verification checks are mandatory
- A successful run ends at `READY_FOR_REVIEW`

## Launch

The supported launch path is the manually triggered GitHub Actions workflow:

`Autonomous Builder Batch`

The workflow requires these repository secrets:

- `VERCEL_TOKEN` — Vercel authentication for Sandbox
- `BUILDER_GITHUB_TOKEN` — GitHub token with permission to clone and push the repository
- `BUILDER_AGENT_CMD_JSON` — JSON array for the chosen coding-agent command, for example `["<agent-cli>","--non-interactive"]`

The agent command is deliberately supplied as a secret rather than hard-coded so the runner does not silently choose a different model or CLI.

## Batch lifecycle

1. GitHub Actions starts one job.
2. The runner creates a fresh ephemeral Sandbox with a 60-minute timeout.
3. The Sandbox clones `main` and creates the isolated batch branch.
4. The configured agent receives the objective and acceptance criteria.
5. The agent builds the largest coherent in-scope chunk it can.
6. Build and verification commands run.
7. Changes are committed and pushed to the batch branch.
8. The Sandbox is stopped in `finally`, including failure paths.
9. A JSON report is uploaded as a workflow artifact.

The runner never merges the branch or deploys production. Human review is the gate before integration.
