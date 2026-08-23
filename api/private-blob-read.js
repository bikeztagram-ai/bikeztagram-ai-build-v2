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

async function readPublicUrl(url, label) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`${label} public Blob URL returned HTTP ${response.status}.`);
  }

  const contentType = text(response.headers.get('content-type')) || 'application/octet-stream';
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);

  return { bytes, contentType };
}

export async function readPrivateBlob({ url = '', pathname = '', label = 'source media' } = {}) {
  const resolvedUrl = text(url);
  const resolvedPathname = text(pathname) || pathnameFromBlobUrl(resolvedUrl);

  // The media store used by Bikeztagram is intentionally PUBLIC: uploaded
  // images/videos are source material that Gemini and the browser renderer
  // must be able to read. Do not force a private SDK read against this store.
  // The upload endpoint may return either the immutable public Blob URL or a
  // short-lived signed GET URL; both are ordinary HTTP-readable source URLs.
  if (resolvedUrl) {
    try {
      const source = await readPublicUrl(resolvedUrl, label);
      return {
        ...source,
        pathname: resolvedPathname || pathnameFromBlobUrl(resolvedUrl),
        blob: null,
      };
    } catch (publicError) {
      // If the URL is a signed URL that has expired or is otherwise unavailable,
      // fall back to the public-store SDK lookup by pathname. This keeps the
      // source-read contract tied to the public store rather than the old
      // private-store token.
      if (!resolvedPathname) throw publicError;
    }
  }

  if (!resolvedPathname) throw new Error(`${label} has no Blob pathname for public read.`);

  const result = await get(resolvedPathname, { access: 'public' });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Vercel Blob could not read ${label}.`);
  }

  const contentType = text(result.blob?.contentType) || 'application/octet-stream';
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);

  return { bytes, contentType, pathname: resolvedPathname, blob: result.blob };
}
