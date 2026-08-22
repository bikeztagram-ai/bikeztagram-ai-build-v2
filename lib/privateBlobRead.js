const text = (value) => String(value ?? '').trim();

export async function readPrivateBlobUrl(url, label = 'source', fallbackMimeType = '') {
  const token = text(process.env.BLOB_READ_WRITE_TOKEN);
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is missing for private Blob read.');
  }

  const rawUrl = text(url);
  if (!rawUrl) {
    throw new Error(`No Blob URL was supplied for ${label}.`);
  }

  let sourceUrl;
  try {
    sourceUrl = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid Blob URL was supplied for ${label}.`);
  }

  // Private Blob reads are authenticated directly against the Blob object URL.
  // cache=0 guarantees the analysis pipeline reads the object immediately after
  // the signed PUT completes instead of relying on a stale CDN cache entry.
  sourceUrl.searchParams.set('cache', '0');

  const response = await fetch(sourceUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Could not download ${label} from Vercel Blob. HTTP ${response.status}`
    );
  }

  const contentType =
    response.headers.get('content-type') ||
    fallbackMimeType ||
    'application/octet-stream';

  const bytes = Buffer.from(await response.arrayBuffer());

  if (!bytes.length) {
    throw new Error(`Private Blob read returned an empty object for ${label}.`);
  }

  return {
    bytes,
    contentType,
    url: sourceUrl.toString(),
  };
}
