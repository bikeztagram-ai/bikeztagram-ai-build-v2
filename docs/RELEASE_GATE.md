# Bikeztagram AI release gate

A candidate may only be deployed to Vercel after the development candidate has passed its verification suite and the current Vercel deployment allowance has been checked.

GitHub commits are development work only. They do not authorize a Vercel deployment.

Automatic Git deployments must remain disabled via `vercel.json`.

The deliberate test sequence is:

1. Verify candidate on GitHub.
2. Verify deployment isolation.
3. Check Vercel quota.
4. Deliberately deploy once.
5. Give the user the deployment URL to test.
6. Record the test result before making another deployment.
