# Blob source-read diagnosis

The first public-read candidate still returned `Vercel Blob could not read source media` at Gemini Step 2.

The Vercel preview runtime log confirms `/api/analyse-library` returned HTTP 500 on the test run.

The reader now tries the returned source URL over HTTP, then a public SDK read with the available Blob token, then a private SDK compatibility read with the same token. Failures are retained in the server error so the next preview run identifies the failing access path instead of collapsing everything into one generic message.

This remains isolated from main and does not modify the protected renderer/Gemini production contract.
