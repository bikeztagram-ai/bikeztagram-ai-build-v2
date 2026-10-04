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
const DEFAULT_CLOUD_API = 'https://api.acemusic.ai';

async function readJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
function unwrap(payload) {
  return payload?.data ?? payload;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

  const configuredBaseUrl = env('ACE_STEP_API_URL');
  const token = env('ACE_STEP_API_TOKEN') || env('ACESTEP_API_KEY');
  // The official hosted ACE-Step API is only selected when a key is actually configured.
  // This keeps the zero-cost public worker as the no-key fallback.
  const baseUrl = configuredBaseUrl || (token ? DEFAULT_CLOUD_API : '');
  const workerUrl = env('ACE_STEP_WORKER_URL') || DEFAULT_ZERO_GPU_WORKER;
  if (!baseUrl && !workerUrl) return json(res, 503, {
    error: 'Open-source music engine is not connected yet.',
    details: 'Set ACE_STEP_API_URL to an ACE-Step 1.5 REST API server. No commercial music API key is required.'
  });

  try {
    const { body, sourceAudio, referenceAudio } = await parseMusicRequest(req);
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return json(res, 400, { error: 'Music prompt is required.' });

    const taskType = String(body.taskType || (sourceAudio ? 'cover' : 'text2music')).trim();
    const coverStrength = clamp(body.coverStrength, 0.1, 1, 0.75);
    const duration = clamp((Number(body.durationMs) || 30000) / 1000, 10, 600, 30);
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    };

    if (baseUrl === DEFAULT_CLOUD_API) {
      return generateViaAceCloud(res, baseUrl, token, {
        prompt, duration, forceInstrumental: Boolean(body.forceInstrumental), bpm: body.bpm, key: body.key,
        mode: body.timeSignature || body.mode, lyrics: body.lyrics, vocalLanguage: body.vocalLanguage,
        vocalDirection: body.vocalDirection, taskType, coverStrength, sourceAudio, referenceAudio
      });
    }

    if (!baseUrl) {
      if (sourceAudio || referenceAudio) return json(res, 501, { error: 'True multi-source audio transformation needs the full ACE-Step engine.', details: 'The current free ZeroGPU worker only exposes text-to-music. Connect ACE_STEP_API_URL to enable source-audio cover/remix and reference-audio workflows.' });
      if (duration > 60) return json(res, 400, { error: 'The free ZeroGPU music worker currently supports up to 60 seconds per request from Bikeztagram.' });
      const vocalPrompt = Boolean(body.forceInstrumental)
        ? prompt
        : buildFallbackVocalPrompt(prompt, body);
      return generateViaGradioWorker(res, workerUrl, token, { prompt: vocalPrompt, duration, forceInstrumental: Boolean(body.forceInstrumental), bpm: body.bpm, vocalMode: !body.forceInstrumental });
    }

    const task = {
      prompt,
      task_type: taskType,
      thinking: true,
      model: 'acestep-v15-turbo',
      audio_duration: duration,
      audio_format: 'mp3',
      inference_steps: 8,
      batch_size: 1,
      use_random_seed: true,
      ...(body.lyrics ? { lyrics: String(body.lyrics) } : {}),
      ...(body.forceInstrumental ? { lyrics: '[inst]' } : {}),
      ...(body.vocalLanguage ? { vocal_language: String(body.vocalLanguage) } : {}),
      ...(body.vocalDirection ? { instruction: String(body.vocalDirection) } : {}),
      ...(Number.isFinite(Number(body.bpm)) ? { bpm: Number(body.bpm) } : {}),
      ...(body.key && body.key !== 'auto' ? { key_scale: String(body.key) } : {}),
      ...(body.timeSignature && body.timeSignature !== 'auto' ? { time_signature: String(body.timeSignature) } : {}),
      ...(sourceAudio ? { audio_cover_strength: coverStrength, cover_noise_strength: Math.max(0, 1 - coverStrength) } : {})
    };

    let submitResponse;
    if (sourceAudio || referenceAudio) {
      const form = new FormData();
      Object.entries(task).forEach(([key, value]) => { if (value !== undefined && value !== null) form.append(key, String(value)); });
      if (sourceAudio) form.append('src_audio', new Blob([Buffer.from(await sourceAudio.arrayBuffer())], { type: sourceAudio.type || 'audio/mpeg' }), sourceAudio.name || 'source-audio');
      if (referenceAudio) form.append('reference_audio', new Blob([Buffer.from(await referenceAudio.arrayBuffer())], { type: referenceAudio.type || 'audio/mpeg' }), referenceAudio.name || 'reference-audio');
      submitResponse = await fetch(baseUrl + '/release_task', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: form });
    } else {
      submitResponse = await fetch(baseUrl + '/release_task', { method: 'POST', headers, body: JSON.stringify(task) });
    }
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

async function generateViaAceCloud(res, baseUrl, token, opts) {
  if (!token) return json(res, 503, { error: 'ACE-Step cloud generation needs an API key.', details: 'Configure ACE_STEP_API_TOKEN or ACESTEP_API_KEY on Vercel. The official ACE-Step cloud API currently offers API keys for free.' });

  const sourceAudio = opts.sourceAudio;
  const referenceAudio = opts.referenceAudio;
  const messageText = [
    `<prompt>${String(opts.prompt || '').trim()}</prompt>`,
    opts.vocalDirection ? `<vocal_direction>${String(opts.vocalDirection).trim()}</vocal_direction>` : '',
    opts.lyrics ? `<lyrics>${String(opts.lyrics).trim()}</lyrics>` : ''
  ].filter(Boolean).join(' ');
  const content = [{ type: 'text', text: messageText }];
  const appendAudio = async (file, label) => {
    if (!file) return;
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!bytes.length) throw new Error(`${label} audio is empty.`);
    content.push({ type: 'text', text: label === 'reference' ? '[REFERENCE AUDIO — use this as the requested secondary musical/vocal reference]' : '[SOURCE AUDIO — use this as the primary transformation source]' });
    const extension = String(file.name || 'audio.mp3').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
    const supported = new Set(['mp3','wav','flac','ogg','m4a','aac']);
    content.push({ type: 'input_audio', input_audio: { data: bytes.toString('base64'), format: supported.has(extension) ? extension : 'mp3' } });
  };
  try {
    // ACE-Step's current multimodal API accepts multiple input_audio blocks.
    // For cover/remix, ACE-Step routes audio[0] to src_audio and audio[1] to reference_audio.
    // Keep the primary source first; the optional second input is the style/vocal reference.
    await appendAudio(sourceAudio, 'source');
    await appendAudio(referenceAudio, 'reference');
  } catch (error) {
    return json(res, 400, { error: error.message });
  }

  const payload = {
    model: 'acemusic/acestep-v15-turbo',
    messages: [{ role: 'user', content }],
    modalities: ['audio'],
    stream: false,
    thinking: false,
    use_format: false,
    sample_mode: false,
    use_cot_caption: false,
    use_cot_language: false,
    task_type: opts.taskType || (sourceAudio ? 'cover' : 'text2music'),
    audio_config: {
      format: 'mp3',
      vocal_language: String(opts.vocalLanguage || 'en'),
      duration: Number(opts.duration),
      instrumental: Boolean(opts.forceInstrumental),
      ...(Number.isFinite(Number(opts.bpm)) ? { bpm: Number(opts.bpm) } : {}),
      ...(opts.key && opts.key !== 'auto' ? { key_scale: String(opts.key) } : {}),
      ...(opts.mode && opts.mode !== 'auto' ? { time_signature: String(opts.mode) } : {})
    },
    ...((sourceAudio || referenceAudio) ? {
      audio_cover_strength: Number(opts.coverStrength),
      cover_noise_strength: Math.max(0, 1 - Number(opts.coverStrength))
    } : {})
  };

  const response = await fetch(baseUrl + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      'User-Agent': 'curl/8.7.1'
    },
    body: JSON.stringify(payload)
  });
  const envelope = await readJson(response);
  if (!response.ok) {
    const providerStatus = response.status;
    const friendly = providerStatus === 504
      ? 'ACE-Step cloud timed out while processing the source transformation. The source was accepted, but the hosted model did not finish within its response window. Try the short test source again; Bikeztagram will keep the request small.'
      : providerStatus === 502
        ? 'ACE-Step cloud temporarily returned a gateway error. Try the transform again.'
        : 'ACE-Step hosted music API rejected the request.';
    return json(res, providerStatus >= 400 && providerStatus < 500 ? providerStatus : 502, {
      error: friendly,
      providerStatus,
      details: providerStatus === 504 || providerStatus === 502 ? '' : cleanProviderDetails(envelope)
    });
  }

  const audio = envelope?.choices?.[0]?.message?.audio?.[0]?.audio_url?.url;
  if (!audio) return json(res, 502, { error: 'ACE-Step hosted API completed without returning audio.', details: JSON.stringify(envelope).slice(0, 3000) });
  const match = /^data:([^;]+);base64,(.+)$/s.exec(String(audio));
  if (!match) return json(res, 502, { error: 'ACE-Step hosted API returned an unsupported audio payload.' });
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) return json(res, 502, { error: 'ACE-Step hosted API returned empty audio.' });
  res.statusCode = 200;
  res.setHeader('Content-Type', match[1] || 'audio/mpeg');
  res.setHeader('Content-Length', String(buffer.byteLength));
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Bikeztagram-Music-Provider', 'ACE-Step 1.5 Cloud');
  res.setHeader('X-Bikeztagram-Music-Original', 'true');
  res.setHeader('X-Bikeztagram-Music-Song-Id', String(envelope?.id || 'cloud-' + Date.now()));
  return res.end(buffer);
}

function cleanProviderDetails(payload) {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  return raw.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 1200);
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


function buildFallbackVocalPrompt(prompt, body) {
  const direction = String(body.vocalDirection || 'natural lead singer appropriate to the genre').trim();
  const language = String(body.vocalLanguage || 'en').trim();
  const lyrics = String(body.lyrics || '').trim();
  const lyricBrief = lyrics ? `Sing these original lyrics: ${lyrics}` : 'Write and sing original lyrics for the song.';
  const opening = ['verse-first','hook-first','chorus-first'][Math.floor(Math.random() * 3)];
  // Keep the fallback prompt compact: the public worker has a text-only interface and long prompts can dilute vocal conditioning.
  return `${String(prompt || '').trim()}. Sung song, not instrumental. Clearly audible melodic lead vocals from the first 1-2 seconds. Vocal: ${direction}. Language: ${language}. ${lyricBrief} Start ${opening}; no long instrumental intro.`.slice(0, 480);
}

async function generateViaGradioWorker(res, workerUrl, token, { prompt, duration, forceInstrumental, bpm }, attempt = 0) {
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
  if (!complete) {
    const workerError = parseSseError(sseText);
    if (attempt < 1) return generateViaGradioWorker(res, workerUrl, token, { prompt, duration, forceInstrumental, bpm }, attempt + 1);
    return json(res, 502, { error: 'ACE-Step ZeroGPU worker did not return a completed track.', details: workerError || sseText.slice(-2500) });
  }
  const first = Array.isArray(complete) ? complete[0] : complete;
  const audioUrl = first?.url || first?.path;
  if (!audioUrl) return json(res, 502, { error: 'ACE-Step ZeroGPU worker completed without an audio file.', details: JSON.stringify(first).slice(0, 2500) });
  return proxyAudio(res, workerUrl, token, audioUrl, submitted.event_id, 'ACE-Step 1.5 ZeroGPU Worker');
}

async function parseMusicRequest(req) {
  const contentType = String(req.headers?.['content-type'] || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    const request = new Request('http://bikeztagram.local/api/music', { method: 'POST', headers: req.headers, body: req, duplex: 'half' });
    const form = await request.formData();
    const body = {};
    for (const [key, value] of form.entries()) if (!(value instanceof File)) body[key] = value;
    const sourceAudio = form.get('sourceAudio');
    const referenceAudio = form.get('referenceAudio');
    return { body, sourceAudio: sourceAudio instanceof File ? sourceAudio : null, referenceAudio: referenceAudio instanceof File ? referenceAudio : null };
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  return { body, sourceAudio: null, referenceAudio: null };
}

function parseSseError(text) {
  const lines = String(text || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== 'event: error') continue;
    return lines[i + 1]?.startsWith('data:') ? lines[i + 1].slice(5).trim() : 'worker error';
  }
  return '';
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
