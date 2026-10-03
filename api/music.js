/* Bikeztagram AI — server-side ACE-Step 1.5 gateway. */
export const maxDuration = 60;

const json = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(payload));
};
const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const env = name => String(process.env[name] || '').trim().replace(/\/$/, '');

async function readProviderJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
function audioPathFrom(result) {
  return result?.first_audio_path || result?.audio_paths?.[0] ||
    result?.result?.first_audio_path || result?.result?.audio_paths?.[0] ||
    result?.audio_path || result?.result?.audio_path || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

  const baseUrl = env('ACE_STEP_API_URL');
  const token = env('ACE_STEP_API_TOKEN');
  if (!baseUrl) return json(res, 503, {
    error: 'Open-source music engine is not connected yet.',
    details: 'Set ACE_STEP_API_URL to an ACE-Step 1.5 REST API server. No commercial music API key is required.'
  });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return json(res, 400, { error: 'Music prompt is required.' });

    const duration = clamp((Number(body.durationMs) || 30000) / 1000, 10, 600, 30);
    const forceInstrumental = Boolean(body.forceInstrumental);
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };
    const generation = {
      caption: prompt,
      duration,
      audio_duration: duration,
      model: 'acestep-v15-turbo',
      thinking: true,
      inference_steps: 8,
      ...(forceInstrumental ? { lyrics: '[inst]' } : {}),
      ...(body.lyrics ? { lyrics: String(body.lyrics) } : {}),
      ...(Number.isFinite(Number(body.bpm)) ? { bpm: Number(body.bpm) } : {}),
      ...(body.key && body.key !== 'auto' ? { key_scale: String(body.key) } : {}),
      ...(body.mode && body.mode !== 'auto' ? { mode: String(body.mode) } : {})
    };

    const submit = await fetch(baseUrl + '/v1/music/generate', {
      method: 'POST', headers, body: JSON.stringify(generation)
    });
    if (!submit.ok) {
      const provider = await readProviderJson(submit);
      return json(res, submit.status >= 400 && submit.status < 500 ? submit.status : 502, {
        error: 'ACE-Step music generation request was rejected.',
        providerStatus: submit.status, details: JSON.stringify(provider).slice(0, 2000)
      });
    }

    const submitted = await submit.json();
    const jobId = submitted.job_id || submitted.id;
    if (!jobId) {
      const directAudio = audioPathFrom(submitted);
      if (!directAudio) return json(res, 502, {
        error: 'ACE-Step did not return a generation job or audio path.',
        details: JSON.stringify(submitted).slice(0, 2000)
      });
      return proxyAudio(res, baseUrl, token, directAudio);
    }

    const deadline = Date.now() + 54000;
    let status = submitted;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const poll = await fetch(baseUrl + '/v1/jobs/' + encodeURIComponent(jobId), {
        headers: token ? { Authorization: 'Bearer ' + token } : {}
      });
      if (!poll.ok) {
        const provider = await readProviderJson(poll);
        return json(res, 502, {
          error: 'ACE-Step job status could not be read.',
          providerStatus: poll.status, details: JSON.stringify(provider).slice(0, 2000)
        });
      }
      status = await poll.json();
      if (status.status === 'failed') return json(res, 502, {
        error: 'ACE-Step generation failed.',
        details: JSON.stringify(status.error || status).slice(0, 2000)
      });
      if (status.status === 'succeeded' || audioPathFrom(status)) break;
    }

    const audioPath = audioPathFrom(status);
    if (!audioPath) return json(res, 504, {
      error: 'ACE-Step is still generating the track.',
      details: 'The open-source engine accepted the job but Vercel stopped waiting. Start with a 15–30 second test.'
    });
    return proxyAudio(res, baseUrl, token, audioPath, jobId);
  } catch (error) {
    return json(res, 502, { error: 'Open-source AI music request failed.', details: error?.message || String(error) });
  }
}

async function proxyAudio(res, baseUrl, token, audioPath, jobId = '') {
  const url = audioPath.startsWith('http') ? audioPath : baseUrl + (audioPath.startsWith('/') ? '' : '/') + audioPath;
  const response = await fetch(url, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  if (!response.ok) {
    const text = await response.text();
    return json(res, 502, {
      error: 'ACE-Step generated audio but it could not be downloaded.',
      providerStatus: response.status, details: text.slice(0, 2000)
    });
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) return json(res, 502, { error: 'ACE-Step returned an empty audio file.' });
  res.statusCode = 200;
  res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/wav');
  res.setHeader('Content-Length', String(buffer.byteLength));
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Bikeztagram-Music-Provider', 'ACE-Step 1.5');
  res.setHeader('X-Bikeztagram-Music-Original', 'true');
  res.setHeader('X-Bikeztagram-Music-Song-Id', String(jobId || response.headers.get('song-id') || ''));
  return res.end(buffer);
}
