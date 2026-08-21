# Vercel Generation Policy V1

Vercel remains part of the Bikeztagram architecture, but heavy model inference must not be performed inside ordinary serverless request lifecycles.

## Vercel responsibilities
- host the PWA
- authenticate/authorise requests when enabled
- create generation jobs
- validate and queue requests
- expose job status
- receive/store lightweight metadata
- orchestrate results into the editing pipeline

## Remote worker responsibilities
- load large AI models
- perform GPU-heavy music/video inference
- produce media
- return output metadata and provenance

## Deployment discipline
- batch related changes
- test before deployment
- deploy only meaningful verified milestones
- avoid repeated tiny pushes/deployments
- keep heavy inference out of Vercel functions
- preserve the protected working baseline

The Git/Vercel connection may remain disconnected during experimental development. Reconnection is a deliberate milestone, not a prerequisite for local/remote-worker testing.
