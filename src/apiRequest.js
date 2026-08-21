/* BIKEZTAGRAM AI — resilient browser API boundary.
   Retries transient network/5xx/rate-limit failures without touching Blob upload. */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function requestJson(url, options = {}, { attempts = 3, baseDelayMs = 700 } = {}) {
  const maxAttempts = Math.max(1, Math.min(4, Number(attempts) || 3));
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const externalSignal = options.signal;
    let timer = null;
    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 90000;
    const signal = controller?.signal;
    if (controller) {
      timer = setTimeout(() => controller.abort(), timeoutMs);
      if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }
    try {
      const { timeoutMs: _timeout, signal: _signal, ...fetchOptions } = options;
      const response = await fetch(url, { ...fetchOptions, signal });
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {
        if (response.ok) throw new Error(`API returned invalid JSON from ${url}: ${text.slice(0, 500)}`);
      }
      if (response.ok) return { response, data, text };
      const message = data?.error || data?.message || `HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.responseData = data;
      if (!RETRYABLE.has(response.status) || attempt >= maxAttempts) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      const abortedByCaller = externalSignal?.aborted;
      const retryableNetwork = !error?.status || error?.name === 'TypeError' || error?.name === 'AbortError';
      if (abortedByCaller || !retryableNetwork || attempt >= maxAttempts) throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
    await sleep(baseDelayMs * (2 ** (attempt - 1)) + Math.floor(Math.random() * 150));
  }
  throw lastError || new Error(`API request failed: ${url}`);
}
