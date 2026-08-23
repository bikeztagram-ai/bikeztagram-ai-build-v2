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

async function readResult(result, label, pathname) {
  if (!result || result.statusCode !== 200 || !result.stream) {
    const status = result?.statusCode ? ` HTTP ${result.statusCode}` : '';
    throw new Error(`Vercel Blob could not read ${label}.${status}`);
  }
  const contentType = text(result.blob?.contentType) || 'application/octet-stream';
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (!bytes.length) throw new Error(`Vercel Blob returned an empty ${label}.`);
  return { bytes, contentType, pathname, blob: result.blob };
}

export async function readPrivateBlob({ url = '', pathname = '', label = 'source media' } = {}) {
  const sourceUrl = text(url);
  const resolvedPathname = text(pathname) || pathnameFromBlobUrl(sourceUrl);
  if (!resolvedPathname && !sourceUrl) throw new Error(`${label} has no Blob URL or pathname for private read.`);

  const attempts = [];

  // Prefer Vercel's normal SDK authentication path. Current Vercel projects
  // can authenticate Private Blob through short-lived OIDC credentials, so we
  // must not force an old static token when OIDC is available.
  for (const target of [sourceUrl, resolvedPathname].filter(Boolean)) {
    try {
      const result = await get(target, { access: 'private', useCache: false });
      return await readResult(result, label, resolvedPathname || target);
    } catch (error) {
      attempts.push(`SDK ${target === sourceUrl ? 'URL' : 'pathname'}: ${error?.message || error}`);
    }
  }

  // Backward compatibility for stores still using the legacy static token.
  const token = text(process.env.BLOB_READ_WRITE_TOKEN);
  if (token && resolvedPathname) {
    try {
      const result = await get(resolvedPathname, { access: 'private', token, useCache: false });
      return await readResult(result, label, resolvedPathname);
    } catch (error) {
      attempts.push(`SDK legacy-token: ${error?.message || error}`);
    }
  }

  // Last resort: the upload endpoint returns a scoped signed GET URL. This
  // capability is valid for the object only and needs no store credential.
  if (sourceUrl) {
    try {
      const response = await fetch(sourceUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw new Error('empty response');
      return {
        bytes,
        contentType: text(response.headers.get('content-type')) || 'application/octet-stream',
        pathname: resolvedPathname,
      };
    } catch (error) {
      attempts.push(`Signed URL: ${error?.message || error}`);
    }
  }

  throw new Error(`Blob source read failed. ${attempts.join('. ')}`);
}
