import { getConfiguredMusicEngineUrl, prepareMusicGeneration } from './musicEngineDirector.js';
/* Bikeztagram AI — open-source music generation gateway. */
function providerBaseUrl() {
  return String(import.meta?.env?.VITE_ACE_STEP_API_URL || '').trim().replace(/\/$/, '');
}

const DEFAULT_VOCAL_WORKERS = [
  'https://victor-ace-step-jam.hf.space',
  'https://timefractal-ace-step-turbo-music-gen.hf.space'
];
const LEGACY_KINES_WORKER = 'https://kines9661-acestepv1-5ai.hf.space';
const MINIMAX_MUSIC_WORKER = 'https://minimaxai-minimax-music3-workflow.hf.space';
const MINIMAX_MAX_DURATION = 300;

async function generateViaMiniMaxMusic3({ prompt, lyrics, duration, vocalDirection = '', vocalLanguage = 'en', huggingFaceToken = '' }) {
  // MiniMax is proxied through our own Vercel function. This avoids browser
  // CORS/preflight failures when an authenticated Hugging Face token is used,
  // while keeping the token device-local and forwarding it only for this request.
  const response = await fetch('/api/music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: String(prompt || '').trim(),
      lyrics: String(lyrics || '').trim(),
      durationMs: Math.max(5000, Math.min(MINIMAX_MAX_DURATION * 1000, Number(duration || 30) * 1000)),
      forceInstrumental: false,
      vocalLanguage: String(vocalLanguage || 'en'),
      vocalDirection: String(vocalDirection || ''),
      taskType: 'text2music',
      huggingFaceToken: String(huggingFaceToken || '').trim()
    })
  });

  if (!response.ok) {
    let detail = '';
    try {
      const payload = await response.json();
      detail = [payload?.error, payload?.details].filter(Boolean).join(' ');
    } catch {
      detail = (await response.text()).slice(0, 1200);
    }
    throw new Error(
      'MiniMax Music 3 worker failed' +
      (response.status ? ' (HTTP ' + response.status + ')' : '') +
      (detail ? ': ' + detail : '')
    );
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error('MiniMax Music 3 returned an empty audio file.');

  return {
    blob,
    mimeType: blob.type || 'audio/wav',
    songId: response.headers.get('X-Bikeztagram-Music-Song-Id') || '',
    provider: response.headers.get('X-Bikeztagram-Music-Provider') || 'MiniMax Music 3 Vocal Worker',
    original: true
  };
}

const WEBNOWA_VOCAL_WORKER = 'https://webnowa-ace-step-jam.hf.space';

async function generateViaWebnowa({ prompt, lyrics, duration, vocalDirection = '' }) {
  const workerUrl = WEBNOWA_VOCAL_WORKER;
  const styledPrompt = [
    String(prompt || '').trim(),
    vocalDirection ? 'Lead vocal direction: ' + String(vocalDirection).trim() : '',
    'Clearly sung melodic lead vocal from the opening section; audible words; do not make this instrumental.'
  ].filter(Boolean).join(' ');

  const submit = await fetch(workerUrl + '/gradio_api/call/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      data: [
        styledPrompt,
        String(lyrics || '').trim(),
        Math.max(10, Math.min(60, Number(duration) || 30)),
        8,
        7,
        -1,
        '',
        0.8
      ]
    })
  });

  const submitted = await submit.json().catch(() => ({}));
  if (!submit.ok || !submitted?.event_id) {
    throw new Error(
      'ACE-Step WebNowa vocal worker rejected the request' +
      (submit.status ? ' (HTTP ' + submit.status + ')' : '') +
      (submitted?.detail ? ': ' + String(submitted.detail) : '')
    );
  }

  const resultResponse = await fetch(
    workerUrl + '/gradio_api/call/generate/' + encodeURIComponent(submitted.event_id),
    { headers: { Accept: 'text/event-stream' } }
  );
  if (!resultResponse.ok) {
    const detail = (await resultResponse.text()).slice(0, 800);
    throw new Error(
      'ACE-Step WebNowa vocal worker status failed (HTTP ' + resultResponse.status + ')' +
      (detail ? ': ' + detail : '')
    );
  }

  const sse = await resultResponse.text();
  const lines = sse.split(/\r?\n/);
  let activeEvent = '';
  let completed = null;
  let workerError = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('event:')) {
      activeEvent = line.slice(6).trim();
      continue;
    }
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (activeEvent === 'error') workerError = data || workerError;
    if (activeEvent === 'complete' || activeEvent === 'completed') {
      let value = data;
      for (let pass = 0; pass < 6 && typeof value === 'string'; pass++) {
        try { value = JSON.parse(value); } catch { break; }
      }
      completed = value;
    }
  }

  if (completed == null) {
    throw new Error(
      workerError && workerError !== 'null'
        ? 'ACE-Step WebNowa vocal worker failed: ' + workerError
        : 'ACE-Step WebNowa vocal worker did not return a completed track.'
    );
  }

  let value = completed;
  for (let pass = 0; pass < 6 && typeof value === 'string'; pass++) {
    try { value = JSON.parse(value); } catch { break; }
  }
  const rawData = Array.isArray(value) ? value[0] : value;
  if (typeof rawData !== 'string' || !/^data:audio\//i.test(rawData)) {
    throw new Error(
      'ACE-Step WebNowa completed without a WAV data URL.' +
      (rawData ? ' Returned: ' + String(rawData).slice(0, 500) : '')
    );
  }

  const match = /^data:([^;]+);base64,(.+)$/s.exec(rawData);
  if (!match) throw new Error('ACE-Step WebNowa returned an invalid audio data URL.');
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: match[1] || 'audio/wav' });
  if (!blob.size) throw new Error('ACE-Step WebNowa returned an empty audio file.');

  return {
    blob,
    mimeType: blob.type || 'audio/wav',
    songId: submitted.event_id,
    provider: 'ACE-Step WebNowa Vocal Worker',
    original: true
  };
}



async function generateViaKinesApi({ prompt, lyrics, duration }) {
  const workerUrl = DEFAULT_VOCAL_WORKERS[0];
  const release = await fetch(workerUrl + '/release_task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      prompt: String(prompt || '').trim(),
      lyrics: String(lyrics || '').trim(),
      thinking: false,
      sample_mode: false,
      use_format: false,
      model: 'acestep-v15-turbo',
      vocal_language: 'en',
      inference_steps: 8,
      guidance_scale: 7,
      use_random_seed: true,
      seed: -1,
      batch_size: 1,
      audio_duration: Number(duration) || 30,
      task_type: 'text2music',
      audio_format: 'mp3',
      use_tiled_decode: true,
      constrained_decoding: true,
      use_cot_caption: false,
      use_cot_language: false
    })
  });
  const releaseData = await release.json().catch(() => ({}));
  if (!release.ok || !releaseData?.task_id) {
    throw new Error(
      'ACE-Step Studio API rejected the request (HTTP ' + release.status + ')' +
      (releaseData?.detail ? ': ' + String(releaseData.detail) : '')
    );
  }

  const taskId = String(releaseData.task_id);
  const deadline = Date.now() + Math.max(90000, (Number(duration) || 30) * 3500);
  let lastStatus = 'queued';

  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const query = await fetch(workerUrl + '/query_result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ task_id_list: [taskId] })
    });
    const payload = await query.json().catch(() => []);
    if (!query.ok) {
      throw new Error('ACE-Step Studio result check failed (HTTP ' + query.status + ').');
    }

    const row = Array.isArray(payload) ? payload[0] : null;
    lastStatus = row?.status ?? lastStatus;

    let resultRows = [];
    if (row?.result) {
      let value = row.result;
      for (let pass = 0; pass < 5 && typeof value === 'string'; pass++) {
        try { value = JSON.parse(value); } catch { break; }
      }
      resultRows = Array.isArray(value) ? value : [];
    }

    if (Number(row?.status) === 2) {
      const detail = resultRows?.[0]?.status_message || resultRows?.[0]?.generation_info || '';
      throw new Error(
        'ACE-Step Studio generation failed.' +
        (detail ? ' ' + String(detail).slice(0, 700) : '')
      );
    }

    if (Number(row?.status) !== 1) continue;

    const first = resultRows.find(item => item?.file) || resultRows[0];
    const rawPath = first?.file;
    if (!rawPath) {
      throw new Error('ACE-Step Studio completed without an audio file.');
    }

    const audioUrl = /^https?:\/\//i.test(rawPath)
      ? rawPath
      : workerUrl + '/v1/audio?path=' + encodeURIComponent(String(rawPath));

    const audio = await fetch(audioUrl);
    if (!audio.ok) {
      throw new Error('ACE-Step Studio generated the song but audio download failed (HTTP ' + audio.status + ').');
    }
    const blob = await audio.blob();
    if (!blob.size) throw new Error('ACE-Step Studio returned an empty audio file.');

    return {
      blob,
      mimeType: blob.type || 'audio/mpeg',
      songId: taskId,
      provider: 'ACE-Step Studio Vocal Worker',
      original: true
    };
  }

  throw new Error('ACE-Step Studio vocal generation timed out after waiting for the worker result (last status: ' + String(lastStatus) + ').');
}
async function generateViaKinesGradioFallback({ prompt, lyrics, duration }) {
  const workerUrl = LEGACY_KINES_WORKER;
  const submit = await fetch(workerUrl + '/gradio_api/call/generate_music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      data: [
        String(prompt || '').trim(),
        String(lyrics || '').trim(),
        Number(duration) || 30,
        null,
        '英文 (en)',
        '否',
        7,
        -1
      ]
    })
  });
  const submitted = await submit.json().catch(() => ({}));
  if (!submit.ok || !submitted?.event_id) {
    throw new Error(
      'ACE-Step 1.5 vocal worker rejected the request' +
      (submit.status ? ' (HTTP ' + submit.status + ')' : '') +
      (submitted?.detail ? ': ' + String(submitted.detail) : '.')
    );
  }

  const resultResponse = await fetch(
    workerUrl + '/gradio_api/call/generate_music/' + encodeURIComponent(submitted.event_id),
    { headers: { Accept: 'text/event-stream' } }
  );
  if (!resultResponse.ok) {
    const detail = (await resultResponse.text()).slice(0, 500);
    throw new Error(
      'ACE-Step 1.5 vocal worker status failed (HTTP ' + resultResponse.status + ')' +
      (detail ? ': ' + detail : '.')
    );
  }

  const sse = await resultResponse.text();
  const lines = sse.split(/\r?\n/);
  let currentEvent = '';
  let completed = null;
  let workerError = '';
  let lastData = '';
  const seenEvents = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
      if (currentEvent && !seenEvents.includes(currentEvent)) seenEvents.push(currentEvent);
      continue;
    }
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data) lastData = data.slice(0, 800);
    if (currentEvent === 'error') workerError = data || workerError;
    if (currentEvent === 'complete' || currentEvent === 'completed') {
      let value = data;
      for (let pass = 0; pass < 5 && typeof value === 'string'; pass++) {
        try { value = JSON.parse(value); } catch { break; }
      }
      completed = value;
    }
  }

  if (completed == null) {
    const cleanError = workerError && workerError !== 'null' ? workerError : '';
    const diagnostic = cleanError || (
      'no completed event; events=' + (seenEvents.join(',') || 'none') +
      (lastData ? '; last data=' + lastData : '')
    );
    throw new Error('ACE-Step 1.5 vocal worker failed: ' + diagnostic);
  }

  let value = completed;
  for (let pass = 0; pass < 5 && typeof value === 'string'; pass++) {
    try { value = JSON.parse(value); } catch { break; }
  }
  const first = Array.isArray(value) ? value[0] : value;
  const rawUrl = typeof first === 'string' ? first : first?.url || first?.path;
  if (!rawUrl) {
    let shape = '';
    try { shape = JSON.stringify(value).slice(0, 1000); } catch {}
    throw new Error(
      'ACE-Step 1.5 vocal worker completed without an audio file.' +
      (shape ? ' Returned data: ' + shape : '')
    );
  }

  const audioUrl = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : rawUrl.startsWith('/gradio_api/file=') ? workerUrl + rawUrl
      : rawUrl.startsWith('/file=') ? workerUrl + rawUrl
        : rawUrl.startsWith('/tmp/') ? workerUrl + '/file=' + rawUrl
          : workerUrl + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl);

  const audio = await fetch(audioUrl);
  if (!audio.ok) {
    throw new Error('ACE-Step 1.5 generated the vocal track but the audio file could not be downloaded.');
  }
  const blob = await audio.blob();
  if (!blob.size) throw new Error('ACE-Step 1.5 vocal worker returned an empty audio file.');

  return {
    blob,
    mimeType: blob.type || 'audio/wav',
    songId: submitted.event_id,
    provider: 'ACE-Step 1.5 Vocal Worker',
    original: true
  };
}
async function generateViaTimefractalWorker({ prompt, lyrics, duration }) {
  const workerUrl = DEFAULT_VOCAL_WORKERS[1];
  const submit = await fetch(workerUrl + '/gradio_api/call/generate_music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      data: [String(prompt || ''), String(lyrics || ''), Number(duration) || 30, Math.floor(Math.random() * 2147483647), 8]
    })
  });
  const submitted = await submit.json().catch(() => ({}));
  if (!submit.ok || !submitted.event_id) throw new Error('ACE-Step Turbo vocal worker rejected the request.');

  const resultResponse = await fetch(workerUrl + '/gradio_api/call/generate_music/' + encodeURIComponent(submitted.event_id), {
    headers: { Accept: 'text/event-stream' }
  });
  if (!resultResponse.ok) throw new Error('ACE-Step Turbo vocal worker status returned HTTP ' + resultResponse.status + '.');

  const sse = await resultResponse.text();
  const lines = sse.split(/\r?\n/);
  let currentEvent = '';
  let completed = null;
  let workerError = '';
  let lastData = '';
  const seenEvents = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
      if (currentEvent && !seenEvents.includes(currentEvent)) seenEvents.push(currentEvent);
      continue;
    }
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data) lastData = data.slice(0, 800);
    if (currentEvent === 'error') workerError = data || workerError;
    if (currentEvent === 'complete' || currentEvent === 'completed') {
      let value = data;
      for (let pass = 0; pass < 5 && typeof value === 'string'; pass++) {
        try { value = JSON.parse(value); } catch { break; }
      }
      completed = value;
    }
  }
  if (completed == null) {
    const cleanError = workerError && workerError !== 'null' ? workerError : '';
    const diagnostic = cleanError || (
      'no completed event; events=' + (seenEvents.join(',') || 'none') +
      (lastData ? '; last data=' + lastData : '')
    );
    throw new Error('ACE-Step Turbo vocal worker failed: ' + diagnostic);
  }

  let value = completed;
  for (let i = 0; i < 5 && typeof value === 'string'; i++) {
    try { value = JSON.parse(value); } catch { break; }
  }
  const first = Array.isArray(value) ? value[0] : value;
  const rawUrl = typeof first === 'string' ? first : first?.url || first?.path;
  if (!rawUrl) throw new Error('ACE-Step Turbo vocal worker completed without an audio file.');
  const audioUrl = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : rawUrl.startsWith('/gradio_api/file=') ? workerUrl + rawUrl
      : rawUrl.startsWith('/file=') ? workerUrl + rawUrl
        : rawUrl.startsWith('/tmp/') ? workerUrl + '/file=' + rawUrl
          : workerUrl + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl);
  const audio = await fetch(audioUrl);
  if (!audio.ok) throw new Error('ACE-Step Turbo generated the song but the audio file could not be downloaded.');
  const blob = await audio.blob();
  if (!blob.size) throw new Error('ACE-Step Turbo returned an empty audio file.');
  return { blob, mimeType: blob.type || 'audio/wav', songId: submitted.event_id, provider: 'ACE-Step 1.5 Turbo Vocal Worker', original: true };
}

async function generateShortVocalDirect({ prompt, lyrics, duration, vocalDirection, vocalLanguage, huggingFaceToken }) {
  const failures = [];
  const providers = [
    ['MiniMax Music 3', generateViaMiniMaxMusic3],
    ['ACE-Step WebNowa', generateViaWebnowa],
    ['ACE-Step Studio API', generateViaKinesApi],
    ['ACE-Step 1.5 legacy Gradio', generateViaKinesGradioFallback],
    ['ACE-Step Turbo', generateViaTimefractalWorker]
  ];
  for (const [name, generator] of providers) {
    try {
      return await generator({ prompt, lyrics, duration, vocalDirection, vocalLanguage, huggingFaceToken });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      failures.push(name + ': ' + detail);
      console.warn('[Bikeztagram Music] vocal provider failed:', name, detail);
    }
  }
  throw new Error(
    failures.length
      ? 'Vocal generation failed. ' + failures.join(' | ')
      : 'No open-source vocal music provider completed the song.'
  );
}

async function generateViaOwnMusicEngine({ prompt, lyrics, durationMs, forceInstrumental, bpm, key, mode, vocalLanguage, vocalDirection }) {
  const baseUrl = getConfiguredMusicEngineUrl();
  if (!baseUrl) return null;
  const prepared = prepareMusicGeneration({
    prompt, lyrics, duration: Number(durationMs) / 1000, bpm, key, mode,
    vocalLanguage, vocalDirection, forceInstrumental
  });
  const response = await fetch(baseUrl + '/v1/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/wav' },
    body: JSON.stringify({
      prompt: prepared.prompt,
      lyrics: prepared.lyrics,
      duration: Math.round(prepared.duration),
      bpm: prepared.bpm,
      key: prepared.key,
      mode: prepared.mode,
      vocalLanguage: prepared.vocalLanguage,
      vocalDirection,
      forceInstrumental: prepared.forceInstrumental
    })
  });
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json())?.detail || ''; } catch { detail = (await response.text()).slice(0, 1000); }
    throw new Error('Bikeztagram Music Engine failed (HTTP ' + response.status + ')' + (detail ? ': ' + detail : ''));
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error('Bikeztagram Music Engine returned an empty audio file.');
  return {
    blob,
    mimeType: blob.type || 'audio/wav',
    songId: response.headers.get('X-Bikeztagram-Music-Song-Id') || '',
    provider: response.headers.get('X-Bikeztagram-Music-Provider') || 'Bikeztagram Music Engine · MiniMax-Music3',
    original: true,
    generatedLyrics: response.headers.get('X-Bikeztagram-Music-Lyrics-Generated') === 'yes',
    director: prepared
  };
}

export async function generateAIMusic({ prompt, durationMs = 30000, forceInstrumental = false, bpm, key, mode, lyrics = '', vocalLanguage = 'en', vocalDirection = '', sourceAudio = null, referenceAudio = null, taskType = 'text2music', coverStrength = 0.75, huggingFaceToken = '' } = {}) {
  // Prefer the permanent Bikeztagram Music Engine whenever it is configured.
  // Hugging Face remains the temporary renderer until the self-hosted engine is online.
  if (!(sourceAudio instanceof Blob) && !(referenceAudio instanceof Blob)) {
    const ownEngine = getConfiguredMusicEngineUrl();
    if (ownEngine) return await generateViaOwnMusicEngine({ prompt, lyrics, durationMs, forceInstrumental, bpm, key, mode, vocalLanguage, vocalDirection });
  }
  // All vocal text-to-music requests must go through /api/music. The server
  // owns MiniMax Music 3 authentication, ZeroGPU quota handling and the
  // MiniMax-only failure contract. Do not call browser-side fallback workers
  // here, or a MiniMax quota failure gets incorrectly wrapped in ACE-Step
  // errors and full-song requests can bypass the server route entirely.
  const hasSource = sourceAudio instanceof Blob;
  const hasReference = referenceAudio instanceof Blob;
  const requestBody = hasSource || hasReference ? (() => { const form = new FormData(); form.append('prompt', String(prompt || '').trim()); form.append('durationMs', String(durationMs)); form.append('forceInstrumental', String(Boolean(forceInstrumental))); if (bpm != null) form.append('bpm', String(bpm)); if (key) form.append('key', String(key)); if (mode) form.append('mode', String(mode)); if (lyrics) form.append('lyrics', String(lyrics)); form.append('taskType', String(taskType || 'cover')); form.append('coverStrength', String(coverStrength)); form.append('vocalLanguage', String(vocalLanguage || 'en')); if (vocalDirection) form.append('vocalDirection', String(vocalDirection)); if (hasSource) form.append('sourceAudio', sourceAudio, sourceAudio.name || 'source-audio'); if (hasReference) form.append('referenceAudio', referenceAudio, referenceAudio.name || 'reference-audio'); return form; })() : JSON.stringify({ prompt: String(prompt || '').trim(), durationMs, forceInstrumental, bpm, key, mode, timeSignature: mode, lyrics, vocalLanguage, vocalDirection, taskType, coverStrength });
  const response = await fetch('/api/music', {
    method: 'POST',
    ...((hasSource || hasReference) ? {} : { headers: { 'Content-Type': 'application/json' } }),
    body: requestBody
  });
  if (!response.ok) {
    let detail = 'Open-source AI music generation failed.';
    try {
      const data = await response.json();
      detail = data.error || detail;
      const combined = [data.error, data.details, data.hint].filter(Boolean).join(' ');
      if (/zerogpu quota exceeded|quota\/authentication|quota.*exhausted|hugging face quota/i.test(combined)) {
        detail = 'MiniMax Music 3 is temporarily out of available Hugging Face GPU quota for this generation. ' +
          'Your current quota is too low for the requested song. Wait for your free quota to reset, or use a Hugging Face token with available ZeroGPU quota in Advanced Options.';
      } else if (data.details) {
        detail += ' ' + data.details;
      }
      if (data.hint && !/zerogpu quota exceeded|quota\/authentication|quota.*exhausted|hugging face quota/i.test(combined)) detail += ' ' + data.hint;
      if (data.providerStatus) detail += ' (provider HTTP ' + data.providerStatus + ')';
    } catch {}
    throw new Error(detail);
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error('ACE-Step returned an empty audio file.');
  return {
    blob,
    mimeType: blob.type || 'audio/wav',
    songId: response.headers.get('X-Bikeztagram-Music-Song-Id') || '',
    provider: response.headers.get('X-Bikeztagram-Music-Provider') || 'ACE-Step 1.5',
    original: true
  };
}

export function aceStepConfiguration() {
  return { provider: 'ACE-Step 1.5', configured: Boolean(providerBaseUrl()), openSource: true, commercialMusicApiRequired: false };
}
