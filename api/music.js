/* Bikeztagram AI — server-side ACE-Step 1.5 REST gateway.
   Official ACE-Step API flow: POST /release_task -> POST /query_result -> GET /v1/audio.
*/
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
const DEFAULT_ZERO_GPU_WORKER = 'https://2btainment-ace-step.hf.space';

async function readJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
function unwrap(payload) {
  return payload?.data ?? payload;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

  const baseUrl = env('ACE_STEP_API_URL');
  const token = env('ACE_STEP_API_TOKEN');
  const workerUrl = env('ACE_STEP_WORKER_URL') || DEFAULT_ZERO_GPU_WORKER;
  if (!baseUrl && !workerUrl) return json(res, 503, {
    error: 'Open-source music engine is not connected yet.',
    details: 'Set ACE_STEP_API_URL to an ACE-Step 1.5 REST API server. No commercial music API key is required.'
  });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return json(res, 400, { error: 'Music prompt is required.' });

    const duration = clamp((Number(body.durationMs) || 30000) / 1000, 10, 600, 30);
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    };

    if (!baseUrl) {
      if (duration > 60) return json(res, 400, { error: 'The free ZeroGPU music worker currently supports up to 60 seconds per request from Bikeztagram.' });
      return generateViaGradioWorker(res, workerUrl, token, { prompt, duration, forceInstrumental, bpm: body.bpm });
    }

    const task = {
      prompt,
      task_type: 'text2music',
      thinking: true,
      model: 'acestep-v15-turbo',
      audio_duration: duration,
      audio_format: 'mp3',
      inference_steps: 8,
      batch_size: 1,
      use_random_seed: true,
      ...(body.lyrics ? { lyrics: String(body.lyrics) } : {}),
      ...(body.forceInstrumental ? { lyrics: '[inst]' } : {}),
      ...(Number.isFinite(Number(body.bpm)) ? { bpm: Number(body.bpm) } : {}),
      ...(body.key && body.key !== 'auto' ? { key_scale: String(body.key) } : {}),
      ...(body.timeSignature && body.timeSignature !== 'auto' ? { time_signature: String(body.timeSignature) } : {})
    };

    const submitResponse = await fetch(baseUrl + '/release_task', {
      method: 'POST',
      headers,
      body: JSON.stringify(task)
    });
    const submittedEnvelope = await readJson(submitResponse);
    if (!submitResponse.ok || submittedEnvelope.code && submittedEnvelope.code !== 200) {
      return json(res, submitResponse.status >= 400 && submitResponse.status < 500 ? submitResponse.status : 502, {
        error: 'ACE-Step music generation request was rejected.',
        providerStatus: submitResponse.status,
        details: JSON.stringify(submittedEnvelope).slice(0, 2500)
      });
    }

    const submitted = unwrap(submittedEnvelope);
    const taskId = submitted?.task_id;
    if (!taskId) return json(res, 502, {
      error: 'ACE-Step did not return a task ID.',
      details: JSON.stringify(submittedEnvelope).slice(0, 2500)
    });

    const deadline = Date.now() + 54000;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const pollResponse = await fetch(baseUrl + '/query_result', {
        method: 'POST',
        headers,
        body: JSON.stringify({ task_id_list: [taskId] })
      });
      const pollEnvelope = await readJson(pollResponse);
      if (!pollResponse.ok) {
        return json(res, 502, {
          error: 'ACE-Step task status could not be read.',
          providerStatus: pollResponse.status,
          details: JSON.stringify(pollEnvelope).slice(0, 2500)
        });
      }

      const items = unwrap(pollEnvelope);
      const item = Array.isArray(items) ? items[0] : items;
      const status = Number(item?.status);

      if (status === 2) {
        return json(res, 502, {
          error: 'ACE-Step generation failed.',
          details: String(item?.error || item?.result || 'Provider reported failure.').slice(0, 2500)
        });
      }

      if (status === 1) {
        let results = item?.result;
        if (typeof results === 'string') {
          try { results = JSON.parse(results); } catch {}
        }
        const first = Array.isArray(results) ? results[0] : results;
        const audioPath = first?.file || first?.url;
        if (!audioPath) return json(res, 502, {
          error: 'ACE-Step completed but returned no audio file.',
          details: JSON.stringify(item).slice(0, 2500)
        });
        return proxyAudio(res, baseUrl, token, audioPath, taskId);
      }
    }

    return json(res, 504, {
      error: 'ACE-Step is still generating the track.',
      details: 'The model accepted the task but Vercel stopped waiting. The production version should use the same task ID asynchronously; short 15–30 second tests are recommended first.'
    });
  } catch (error) {
    return json(res, 502, {
      error: 'Open-source AI music request failed.',
      details: error?.message || String(error)
    });
  }
}

async function proxyAudio(res, baseUrl, token, audioPath, taskId, providerName = 'ACE-Step 1.5') {
  const url = audioPath.startsWith('http')
    ? audioPath
    : baseUrl + (audioPath.startsWith('/') ? '' : '/') + audioPath;

  const response = await fetch(url, {
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  });
  if (!response.ok) {
    const text = await response.text();
    return json(res, 502, {
      error: 'ACE-Step generated audio but it could not be downloaded.',
      providerStatus: response.status,
      details: text.slice(0, 2500)
    });
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) return json(res, 502, { error: 'ACE-Step returned an empty audio file.' });

  res.statusCode = 200;
  res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
  res.setHeader('Content-Length', String(buffer.byteLength));
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Bikeztagram-Music-Provider', providerName);
  res.setHeader('X-Bikeztagram-Music-Original', 'true');
  res.setHeader('X-Bikeztagram-Music-Song-Id', String(taskId || ''));
  return res.end(buffer);
}


async function generateViaGradioWorker(res, workerUrl, token, { prompt, duration, forceInstrumental, bpm }) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {})
  };
  const data = [
    prompt,
    duration,
    -1,
    8,
    Boolean(forceInstrumental)
  ];
  if (Number.isFinite(Number(bpm))) data[0] = `${prompt}. Tempo ${Number(bpm)} BPM.`;

  const submit = await fetch(workerUrl + '/gradio_api/call/_generate', {
    method: 'POST', headers, body: JSON.stringify({ data })
  });
  const submitted = await readJson(submit);
  if (!submit.ok || !submitted?.event_id) {
    return json(res, submit.status >= 400 && submit.status < 500 ? submit.status : 502, {
      error: 'ACE-Step ZeroGPU worker rejected the request.',
      providerStatus: submit.status,
      details: JSON.stringify(submitted).slice(0, 2500)
    });
  }

  const eventResponse = await fetch(workerUrl + '/gradio_api/call/_generate/' + encodeURIComponent(submitted.event_id), {
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  });
  if (!eventResponse.ok) {
    const text = await eventResponse.text();
    return json(res, 502, { error: 'ACE-Step ZeroGPU worker status could not be read.', providerStatus: eventResponse.status, details: text.slice(0, 2500) });
  }

  const sseText = await eventResponse.text();
  const complete = parseSseComplete(sseText);
  if (!complete) return json(res, 502, { error: 'ACE-Step ZeroGPU worker did not return a completed track.', details: sseText.slice(-2500) });
  const first = Array.isArray(complete) ? complete[0] : complete;
  const audioUrl = first?.url || first?.path;
  if (!audioUrl) return json(res, 502, { error: 'ACE-Step ZeroGPU worker completed without an audio file.', details: JSON.stringify(first).slice(0, 2500) });
  return proxyAudio(res, workerUrl, token, audioUrl, submitted.event_id, 'ACE-Step 1.5 ZeroGPU Worker');
}

function parseSseComplete(text) {
  const lines = String(text || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== 'event: complete') continue;
    const data = lines[i + 1]?.startsWith('data:') ? lines[i + 1].slice(5).trim() : '';
    try { return JSON.parse(data); } catch { return null; }
  }
  return null;
}
