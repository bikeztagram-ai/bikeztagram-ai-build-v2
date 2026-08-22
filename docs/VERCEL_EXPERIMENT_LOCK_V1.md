# Vercel Experiment Lock V1

For the current experimental AI-generation phase, Vercel is deliberately disconnected from Git.

Rules:
- Do not treat GitHub pushes as Vercel deployment actions.
- Do not deploy generation runtimes to Vercel.
- Do not put local model weights or inference workloads into Vercel serverless functions.
- Keep experimental branches separate from the protected working baseline.
- Reconnect/deploy only after the real-generation benchmark and end-to-end hardening milestone is passed deliberately.
