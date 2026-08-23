# Vercel Public Media Blob Store

The `fix/public-blob-gemini-v2` preview expects the dedicated public media Blob store created in Vercel with the `PUBLIC_BLOB` environment-variable prefix and read-write token enabled.

Required runtime variable:
- `PUBLIC_BLOB_READ_WRITE_TOKEN`

The existing private `BLOB_*` store remains separate and is not used by `/api/blob-presign` for Gemini source media.

This marker exists only to trigger a fresh preview deployment after the Vercel Blob store connection was created, so the new environment variables are included in the deployment.
