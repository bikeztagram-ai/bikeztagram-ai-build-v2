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

async function readHttpSource(url, label) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${label} public Blob URL returned HTTP ${response.status}.`);
  const contentType = text(response.headers.get('content-type')) || 'application/octet-stream';
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);
  return { bytes, contentType };
}

async function readPublicSource(pathname, token, label) {
  if (!token) throw new Error('PUBLIC_BLOB_READ_WRITE_TOKEN is missing.');
  const result = await get(pathname, { access: 'public', token, useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`${label} public SDK read returned no stream.`);
  }
  const contentType = text(result.blob?.contentType) || 'application/octet-stream';
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);
  return { bytes, contentType, blob: result.blob };
}

export async function readPrivateBlob({ url = '', pathname = '', label = 'source media' } = {}) {
  const resolvedUrl = text(url);
  const resolvedPathname = text(pathname) || pathnameFromBlobUrl(resolvedUrl);
  const token = text(process.env.PUBLIC_BLOB_READ_WRITE_TOKEN);
  const failures = [];

  if (resolvedUrl) {
    try {
      const source = await readHttpSource(resolvedUrl, label);
      return { ...source, pathname: resolvedPathname || pathnameFromBlobUrl(resolvedUrl), blob: null };
    } catch (error) {
      failures.push(`url:${error?.message || error}`);
    }
  }

  if (!resolvedPathname) {
    throw new Error(`${label} has no Blob pathname or readable source URL. ${failures.join(' | ')}`);
  }

  try {
    const source = await readPublicSource(resolvedPathname, token, label);
    return { ...source, pathname: resolvedPathname };
  } catch (error) {
    failures.push(`public-sdk:${error?.message || error}`);
  }

  throw new Error(`Canonical public Vercel Blob could not read ${label}. ${failures.join(' | ')}`);
}
