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
      error.responseData = data; error.category = classifyRequestFailure(error);
      if (!RETRYABLE.has(response.status) || attempt >= maxAttempts) throw error;
      lastError = error;
    } catch (error) {
      error.category = classifyRequestFailure(error);
      lastError = error;
      const abortedByCaller = externalSignal?.aborted;
      const retryableHttp = Number.isInteger(error?.status) && RETRYABLE.has(error.status);
      const retryableNetwork = !error?.status || error?.name === 'TypeError' || error?.name === 'AbortError';
      if (abortedByCaller || (!retryableHttp && !retryableNetwork) || attempt >= maxAttempts) throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
    await sleep(baseDelayMs * (2 ** (attempt - 1)) + Math.floor(Math.random() * 150));
  }
  throw lastError || new Error(`API request failed: ${url}`);
}

export function classifyRequestFailure(error){
 const status=Number(error?.status)||0;
 if(error?.name==='AbortError') return 'timeout';
 if(status===429) return 'rate-limit';
 if(status>=500) return 'provider-unavailable';
 if(status>=400) return 'request-rejected';
 if(!status) return 'network-unavailable';
 return 'unknown';
}

export function classifyApiFailure(error){
 const status=Number(error?.status||error?.response?.status||0);
 const message=String(error?.message||error||'').toLowerCase();
 if(status===408||status===504||message.includes('timeout')) return {kind:'timeout',retryable:true};
 if(status===429||message.includes('rate limit')||message.includes('quota')) return {kind:'rate-limit',retryable:true};
 if(status>=500||message.includes('unavailable')||message.includes('service')) return {kind:'provider-unavailable',retryable:true};
 if(!navigatorOnlineSafe()) return {kind:'offline',retryable:true};
 return {kind:'request-failed',retryable:false};
}
function navigatorOnlineSafe(){return typeof navigator==='undefined'||navigator.onLine!==false;}

export function getRetryDelay(attempt,options={}){
 const n=Math.max(0,Number(attempt)||0);
 const base=Math.max(50,Number(options.baseMs)||400);
 const cap=Math.max(base,Number(options.maxMs)||4000);
 return Math.min(cap,Math.round(base*(2**n)));
}
