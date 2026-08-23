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

async function readResponse(response, label) {
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 200);
    throw new Error(`Private Blob read returned HTTP ${response.status}${detail ? `: ${detail}` : '.'}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);
  return {
    bytes,
    contentType: text(response.headers.get('content-type')) || 'application/octet-stream',
  };
}

async function readSignedUrl(url, label) {
  return readResponse(await fetch(url, { cache: 'no-store' }), label);
}

async function readAuthenticatedUrl(url, label) {
  const token = text(process.env.BLOB_READ_WRITE_TOKEN);
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not configured for authenticated Blob URL fallback.');
  return readResponse(await fetch(url, {
    cache: 'no-store',
    headers: { authorization: `Bearer ${token}` },
  }), label);
}

async function readSdk(target, label) {
  // IMPORTANT: this project has one explicit private Blob store. Prefer the
  // store's read/write token over ambient Vercel OIDC. OIDC can be valid for
  // the project while resolving against a different storage context, producing
  // a misleading 404 for a blob that is visibly present in the intended store.
  const token = text(process.env.BLOB_READ_WRITE_TOKEN);
  const oidcToken = text(process.env.VERCEL_OIDC_TOKEN);
  const options = { access: 'private' };
  if (token) options.token = token;
  else if (oidcToken) options.oidcToken = oidcToken;
  else throw new Error('No private Blob authentication token is configured.');

  const result = await get(target, options);
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Vercel Blob SDK returned status ${result?.statusCode ?? 'no-result'} for ${label}.`);
  }
  const contentType = text(result.blob?.contentType) || 'application/octet-stream';
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);
  return { bytes, contentType, blob: result.blob };
}

export async function readPrivateBlob({ url = '', pathname = '', label = 'source media' } = {}) {
  const resolvedUrl = text(url);
  const resolvedPathname = text(pathname) || pathnameFromBlobUrl(resolvedUrl);
  if (!resolvedPathname && !resolvedUrl) throw new Error(`${label} has no Blob source for private read.`);

  const failures = [];

  // The pathname is the authoritative identifier returned by /api/blob-presign.
  // Read it directly from the intended private store first. This avoids relying
  // on a browser-facing signed URL whose host/path can obscure the store context.
  if (resolvedPathname) {
    try {
      const sdkByPath = await readSdk(resolvedPathname, label);
      return { ...sdkByPath, pathname: resolvedPathname };
    } catch (error) {
      failures.push(`sdk-path: ${error?.message || error}`);
    }
  }

  // Fallbacks are retained for older source records and for compatibility with
  // already-issued signed URLs.
  if (resolvedUrl) {
    try {
      const signed = await readSignedUrl(resolvedUrl, label);
      return { ...signed, pathname: resolvedPathname, blob: { contentType: signed.contentType } };
    } catch (error) {
      failures.push(`signed-url: ${error?.message || error}`);
    }

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const authenticated = await readAuthenticatedUrl(resolvedUrl, label);
        return { ...authenticated, pathname: resolvedPathname, blob: { contentType: authenticated.contentType } };
      } catch (error) {
        failures.push(`authorization-header: ${error?.message || error}`);
      }
    }

    try {
      const sdkByUrl = await readSdk(resolvedUrl, label);
      return { ...sdkByUrl, pathname: resolvedPathname };
    } catch (error) {
      failures.push(`sdk-url: ${error?.message || error}`);
    }
  }

  throw new Error(`Vercel Blob could not read ${label}. ${failures.join(' | ')}`);
}
