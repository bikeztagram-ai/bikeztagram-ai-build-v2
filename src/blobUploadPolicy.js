// Bikeztagram AI — Blob upload resilience guard.
// Keeps the proven public, non-multipart Blob configuration intact.
// It only adds an idle timeout and one retry so a stalled SDK request
// cannot leave the filmmaker pipeline pending forever.
import { upload as blobUpload } from '@vercel/blob/client';

const IDLE_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(error, timedOut) {
  if (timedOut) return true;
  if (error?.name === 'AbortError') return false;
  if (error instanceof TypeError) return true;
  const message = String(error?.message || '').toLowerCase();
  return message.includes('network') || message.includes('fetch failed') || message.includes('request was aborted');
}

export async function uploadWithIdleTimeout(pathname, body, options = {}) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (options.abortSignal?.aborted) {
      throw new DOMException('Blob upload was cancelled.', 'AbortError');
    }

    const controller = new AbortController();
    let timedOut = false;
    let timer = null;

    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, IDLE_TIMEOUT_MS);
    };

    const parentAbort = () => controller.abort();
    options.abortSignal?.addEventListener('abort', parentAbort, { once: true });
    arm();

    const guardedOptions = {
      ...options,
      abortSignal: controller.signal,
      onUploadProgress: (event) => {
        arm();
        options.onUploadProgress?.(event);
      },
    };

    try {
      return await blobUpload(pathname, body, guardedOptions);
    } catch (error) {
      const retryable = isRetryable(error, timedOut);
      if (!retryable || attempt >= MAX_ATTEMPTS) {
        if (timedOut) {
          const timeoutError = new Error(`Vercel Blob upload stalled for more than ${IDLE_TIMEOUT_MS / 1000}s: ${pathname}`);
          timeoutError.name = 'BlobUploadIdleTimeoutError';
          timeoutError.cause = error;
          throw timeoutError;
        }
        throw error;
      }
      await wait(750 * attempt);
    } finally {
      if (timer) clearTimeout(timer);
      options.abortSignal?.removeEventListener('abort', parentAbort);
    }
  }

  throw new Error(`Vercel Blob upload failed after ${MAX_ATTEMPTS} attempts: ${pathname}`);
}
