# Autonomous Builder Guidance

## Context discipline
- Do not read the entire repository unless the batch objective genuinely requires it.
- Start by inspecting `package.json`, the batch objective/queue, and only the source files directly relevant to the objective.
- Use targeted search (`rg`, `git grep`, directory listings) to locate dependencies before opening files.
- Avoid reading generated output, binary/media assets, dependency trees, archives, or historical reports.
- Prefer concise summaries of findings over dumping large files into the model context.

## Implementation
- Make the largest coherent in-scope change that can be verified safely in the current batch.
- Preserve working behaviour outside the objective.
- Do not modify `.github/workflows/**` during product batches.
- Do not commit or push; the runner owns Git publication.

## Verification
- Run the required build and verification commands after implementation.
- If verification fails, inspect only the relevant files and fix the concrete failure.
- Never repeatedly reread the whole repository just to diagnose one test failure.
