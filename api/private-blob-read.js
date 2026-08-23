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

async function readSignedUrl(url, label) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Signed Blob read returned HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);
  return {
    bytes,
    contentType: text(response.headers.get('content-type')) || 'application/octet-stream',
  };
}

export async function readPrivateBlob({ url = '', pathname = '', label = 'source media' } = {}) {
  const resolvedUrl = text(url);
  const resolvedPathname = text(pathname) || pathnameFromBlobUrl(resolvedUrl);
  if (!resolvedPathname && !resolvedUrl) throw new Error(`${label} has no Blob source for private read.`);

  // The upload endpoint already issues a scoped signed GET URL. Prefer that
  // URL when the client supplies it: this avoids depending on a serverless
  // function having a static BLOB_READ_WRITE_TOKEN and works with private
  // stores without exposing credentials to the browser.
  if (resolvedUrl) {
    try {
      const signed = await readSignedUrl(resolvedUrl, label);
      return {
        ...signed,
        pathname: resolvedPathname,
        blob: { contentType: signed.contentType },
      };
    } catch (signedError) {
      console.warn(`[PRIVATE-BLOB] signed URL read failed for ${label}; trying authenticated SDK read.`, signedError?.message || signedError);
    }
  }

  if (!resolvedPathname) throw new Error(`Vercel Blob could not read ${label}: no pathname available.`);

  const options = { access: 'private' };
  if (process.env.VERCEL_OIDC_TOKEN) options.oidcToken = process.env.VERCEL_OIDC_TOKEN;
  else if (process.env.BLOB_READ_WRITE_TOKEN) options.token = process.env.BLOB_READ_WRITE_TOKEN;

  const result = await get(resolvedPathname, options);
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Vercel Blob could not read ${label}.`);
  }

  const contentType = text(result.blob?.contentType) || 'application/octet-stream';
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);

  return { bytes, contentType, pathname: resolvedPathname, blob: result.blob };
}
