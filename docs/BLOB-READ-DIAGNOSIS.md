# Blob source-read diagnosis

The first public-read candidate still returned `Vercel Blob could not read source media` at Gemini Step 2.

The Vercel preview runtime log confirms `/api/analyse-library` returned HTTP 500 on the test run.

The reader now tries, in order:

1. The source URL returned by the upload boundary over normal HTTP.
2. `@vercel/blob.get(pathname, { access: 'public', token })`.
3. A compatibility `get(pathname, { access: 'private', token })` path for stores/configurations that still require private access.

The token accepts either `PUBLIC_BLOB_READ_WRITE_TOKEN` or the standard `BLOB_READ_WRITE_TOKEN` environment variable. Failures are retained in the server error so the next preview run identifies the actual failing access path instead of collapsing everything into one generic message.

This remains isolated from `main` and does not modify the protected renderer/Gemini production contract.
