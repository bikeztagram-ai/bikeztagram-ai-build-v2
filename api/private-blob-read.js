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

function blobReadToken() {
  return text(process.env.BLOB_READ_WRITE_TOKEN) || text(process.env.PUBLIC_BLOB_READ_WRITE_TOKEN);
}

async function consumeSdkResult(result, label) {
  if (!result || result.statusCode !== 200 || !result.stream) throw new Error(`${label} SDK read returned no stream.`);
  const contentType = text(result.blob?.contentType) || 'application/octet-stream';
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);
  return { bytes, contentType, blob: result.blob };
}

async function readHttpSource(url, label) {
  const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  if (!response.ok) throw new Error(`${label} Blob URL returned HTTP ${response.status}.`);
  const contentType = text(response.headers.get('content-type')) || 'application/octet-stream';
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);
  return { bytes, contentType, blob: null };
}

async function readSdkSource(target, access, token, label) {
  return consumeSdkResult(await get(target, { access, token, useCache: false }), `${label} ${access} SDK`);
}

// The upload endpoint returns a short-lived signed GET URL. Treat that URL as the
// authoritative read credential; pathname SDK access is only a fallback for older
// objects. This avoids incorrectly inferring a private/public store from a hostname.
export async function readPrivateBlob({ url = '', pathname = '', label = 'source media' } = {}) {
  const resolvedUrl = text(url);
  const resolvedPathname = text(pathname) || pathnameFromBlobUrl(resolvedUrl);
  const token = blobReadToken();
  const failures = [];

  if (!resolvedUrl && !resolvedPathname) throw new Error(`${label} has no Blob URL or pathname.`);

  if (resolvedUrl) {
    try {
      return { ...(await readHttpSource(resolvedUrl, label)), pathname: resolvedPathname, readMethod: 'signed-get-url' };
    } catch (error) {
      failures.push(`signed-get-url:${error?.message || error}`);
    }
  }

  if (resolvedPathname && token) {
    for (const access of ['private', 'public']) {
      try {
        return { ...(await readSdkSource(resolvedPathname, access, token, label)), pathname: resolvedPathname, readMethod: `${access}-sdk-path` };
      } catch (error) {
        failures.push(`${access}-sdk-path:${error?.message || error}`);
      }
    }
  }

  throw new Error(`Vercel Blob could not read ${label}. Verify the signed GET URL, stored pathname, store access mode and server Blob token. ${failures.join(' | ')}`);
}
