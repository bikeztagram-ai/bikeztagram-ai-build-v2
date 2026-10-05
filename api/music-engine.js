import { issueSignedToken, presignUrl } from '@vercel/blob';

export const maxDuration = 60;

const env = name => String(process.env[name] || '').trim();
const json = (status, payload) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

function runpodBase() {
  const endpoint = env('RUNPOD_ENDPOINT_ID');
  return endpoint ? 'https://api.runpod.ai/v2/' + encodeURIComponent(endpoint) : '';
}

function runpodHeaders() {
  const key = env('RUNPOD_API_KEY');
  return key ? { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' } : null;
}

async function issuePut(pathname) {
  const token = await issueSignedToken({ pathname, operations: ['put'] });
  return (await presignUrl(token, {
    pathname,
    operation: 'put',
    validUntil: Date.now() + 15 * 60 * 1000,
  })).presignedUrl;
}

async function issueGet(pathname) {
  const token = await issueSignedToken({ pathname, operations: ['get'] });
  return (await presignUrl(token, {
    pathname,
    operation: 'get',
    validUntil: Date.now() + 60 * 60 * 1000,
    useCache: false,
  })).presignedUrl;
}

export default async function handler(req) {
  const base = runpodBase();
  const headers = runpodHeaders();
  if (!base || !headers) return json(503, {
    error: 'Private GPU Music Engine is not configured.',
    details: 'Set RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY on the Vercel project. No GPU is started until these are configured.'
  });

  if (req.method === 'GET') {
    const jobId = new URL(req.url).searchParams.get('jobId');
    if (!jobId) {
      const health = await fetch(base + '/health', { headers: { Authorization: headers.Authorization }, cache: 'no-store' });
      const data = await health.json().catch(() => ({}));
      return json(health.ok ? 200 : 502, { ok: health.ok, provider: 'RunPod Serverless · MiniMax Music 3', health: data });
    }
    const response = await fetch(base + '/status/' + encodeURIComponent(jobId), {
      headers: { Authorization: headers.Authorization },
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json(502, { error: 'RunPod job status could not be read.', details: JSON.stringify(data).slice(0, 1500) });
    if (data.status === 'COMPLETED') {
      const output = data.output || {};
      if (output.pathname) {
        const audioUrl = await issueGet(output.pathname);
        return json(200, {
          status: 'COMPLETED',
          audioUrl,
          mimeType: output.mime_type || 'audio/wav',
          songId: output.song_id || jobId,
          generatedLyrics: Boolean(output.generated_lyrics),
          duration: output.duration || null,
          provider: 'Bikeztagram Music Engine · MiniMax-Music3'
        });
      }
      if (output.audio_base64) {
        return json(200, {
          status: 'COMPLETED',
          audioBase64: output.audio_base64,
          mimeType: output.mime_type || 'audio/mpeg',
          songId: output.song_id || jobId,
          generatedLyrics: Boolean(output.generated_lyrics),
          duration: output.duration || null,
          provider: 'Bikeztagram Music Engine · MiniMax-Music3'
        });
      }
      return json(502, { error: 'MiniMax Music 3 completed without an audio result.' });
    }
    if (['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(String(data.status))) {
      return json(502, { status: data.status, error: 'Private MiniMax Music 3 render failed.', details: data.error || data.output?.error || '' });
    }
    return json(200, { status: data.status || 'IN_PROGRESS', jobId, provider: 'Bikeztagram Music Engine · MiniMax-Music3' });
  }

  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  try {
    const input = await req.json();
    const duration = Math.max(5, Math.min(180, Number(input.duration) || 30));
    const pathname = 'music-engine/' + Date.now() + '-' + crypto.randomUUID() + '.wav';
    const outputPutUrl = await issuePut(pathname);
    const payload = {
      input: {
        ...input,
        duration,
        output_path: pathname,
        output_put_url: outputPutUrl,
      }
    };
    const response = await fetch(base + '/run', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id) return json(502, {
      error: 'RunPod did not accept the MiniMax Music 3 job.',
      providerStatus: response.status,
      details: JSON.stringify(data).slice(0, 1800)
    });
    return json(202, {
      status: data.status || 'IN_QUEUE',
      jobId: data.id,
      provider: 'Bikeztagram Music Engine · MiniMax-Music3'
    });
  } catch (error) {
    return json(502, { error: 'Private MiniMax Music 3 request failed.', details: error?.message || String(error) });
  }
}
