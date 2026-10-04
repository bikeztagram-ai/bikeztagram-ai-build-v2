/* Bikeztagram AI — open-source music generation gateway. */
function providerBaseUrl() {
  return String(import.meta?.env?.VITE_ACE_STEP_API_URL || '').trim().replace(/\/$/, '');
}

const DEFAULT_VOCAL_WORKERS = [
  'https://kines9661-acestepv1-5ai.hf.space',
  'https://timefractal-ace-step-turbo-music-gen.hf.space'
];

async function generateViaKinesApi({ prompt, lyrics, duration }) {
  const workerUrl = DEFAULT_VOCAL_WORKERS[0];
  const response = await fetch(workerUrl + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: String(prompt || '').trim() }],
      lyrics: String(lyrics || '').trim(),
      sample_mode: true,
      audio_config: {
        vocal_language: 'en',
        instrumental: false,
        duration: Number(duration) || 30
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error('ACE-Step vocal API returned HTTP ' + response.status + (data?.detail ? ': ' + String(data.detail) : '.'));
  }
  const audioUrl = data?.choices?.[0]?.message?.audio?.[0]?.audio_url?.url;
  if (!audioUrl) throw new Error('ACE-Step vocal API completed without an audio result.');
  if (!audioUrl.startsWith('data:')) throw new Error('ACE-Step vocal API returned an unsupported audio URL.');
  const comma = audioUrl.indexOf(',');
  if (comma < 0) throw new Error('ACE-Step vocal API returned malformed audio data.');
  const header = audioUrl.slice(0, comma);
  const encoded = audioUrl.slice(comma + 1);
  const mimeType = header.match(/^data:([^;]+)/i)?.[1] || 'audio/wav';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  if (!blob.size) throw new Error('ACE-Step vocal API returned an empty audio file.');
  return { blob, mimeType, songId: data?.id || '', provider: 'ACE-Step 1.5 Vocal API', original: true };
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
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
      continue;
    }
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (currentEvent === 'error') workerError = data || workerError;
    if (currentEvent === 'complete' || currentEvent === 'completed') {
      try { completed = JSON.parse(data); } catch { completed = data; }
    }
  }
  if (completed == null) {
    const cleanError = workerError && workerError !== 'null' ? workerError : '';
    throw new Error(cleanError ? 'ACE-Step Turbo vocal worker failed: ' + cleanError : 'ACE-Step Turbo vocal worker did not return a completed sung track.');
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

async function generateShortVocalDirect({ prompt, lyrics, duration }) {
  let lastError = '';
  for (const generator of [generateViaKinesApi, generateViaTimefractalWorker]) {
    try {
      return await generator({ prompt, lyrics, duration });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn('[Bikeztagram Music] vocal provider failed:', lastError);
    }
  }
  throw new Error(lastError || 'No open-source vocal music provider completed the song.');
}

export async function generateAIMusic({ prompt, durationMs = 30000, forceInstrumental = false, bpm, key, mode, lyrics = '', vocalLanguage = 'en', vocalDirection = '', sourceAudio = null, referenceAudio = null, taskType = 'text2music', coverStrength = 0.75 } = {}) {
  if (!sourceAudio && !referenceAudio && !forceInstrumental && Number(durationMs) <= 60000) {
    return generateShortVocalDirect({
      prompt,
      lyrics,
      duration: Number(durationMs) / 1000
    });
  }
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
      if (data.details) detail += ' ' + data.details;
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
