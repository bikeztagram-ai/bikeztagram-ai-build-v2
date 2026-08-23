import { get } from '@vercel/blob';

const text = (value) => String(value ?? '').trim();

export function pathnameFromBlobUrl(value) {
  const url = text(value);
  if (!url) return '';
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''));
  } catch {
    return '';
  }
}

export async function readPrivateBlob({ url = '', pathname = '', label = 'source media' } = {}) {
  const resolvedPathname = text(pathname) || pathnameFromBlobUrl(url);
  if (!resolvedPathname) throw new Error(`${label} has no Blob pathname for private read.`);

  // The production Blob store is private. Always pass the server-side
  // read/write token explicitly so this helper remains independent of
  // implicit SDK environment discovery across Vercel runtimes.
  const token = text(process.env.BLOB_READ_WRITE_TOKEN);
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is missing for private Blob read.');

  const result = await get(resolvedPathname, {
    access: 'private',
    token,
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Vercel Blob could not read ${label}.`);
  }

  const contentType = text(result.blob?.contentType) || 'application/octet-stream';
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);
  return { bytes, contentType, pathname: resolvedPathname, blob: result.blob };
}
