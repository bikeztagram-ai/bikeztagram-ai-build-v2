# Creative Film Vertical Slice — Next Checkpoint

Goal: prove that one natural-language creative request can produce a coherent production plan spanning real media, generated inserts, original music and renderer-ready cuts without changing the protected Blob/Gemini foundation.

Current acceptance layers:
- Creative Director produces generation requests.
- Renderer bridge materialises uploaded and generated scenes into one timeline plan.
- Original music runtime produces an audible WAV fallback and preserves original-music metadata.
- Protected foundation guard remains a separate regression gate.

Live acceptance still required:
- Real browser media ingestion through the protected Blob/Gemini path.
- Real Android playback of generated soundtrack.
- Real procedural/generated scene materialisation.
- End-to-end render with generated inserts and music together.

Next user checkpoint should use one exact Vercel Preview deployment after CI is green; do not ask the user to choose a deployment from the dashboard.
