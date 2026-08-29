# Feature-Level Autonomous Engineering Contract

The AutoBot is a product builder, not a pass counter.

For each unfinished product objective it must:

1. Read the objective, acceptance criteria, constraints, project memory and lessons.
2. Read every declared production file needed for the objective.
3. Produce one coherent implementation patch for the objective increment.
4. Change only declared production files; never builder/workflow/secrets/infrastructure paths.
5. Reject empty, cosmetic, placeholder, dependency-sprawl, or out-of-scope patches.
6. Run `git diff --check` and the production build.
7. Record the objective as verified only after the build succeeds.
8. Persist success/failure state so an interrupted session resumes safely.
9. Never claim an objective is complete when the implementation or verification failed.
10. Continue to the next objective until the time budget is exhausted or no useful work remains.

A future behavioural verification layer may add browser/media integration checks. Until those exist, a green production build is necessary but not sufficient for claiming a fully user-visible feature is complete.
