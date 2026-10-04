/* Bikeztagram AI — open-source music generation gateway. */
function providerBaseUrl() {
  return String(import.meta?.env?.VITE_ACE_STEP_API_URL || '').trim().replace(/\/$/, '');
}

const DEFAULT_VOCAL_WORKER = 'https://timefractal-ace-step-turbo-music-gen.hf.space';

async function generateShortVocalDirect({ prompt, lyrics, duration }) {
  const workerUrl = DEFAULT_VOCAL_WORKER;
  const submit = await fetch(workerUrl + '/gradio_api/call/generate_music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      data: [String(prompt || ''), String(lyrics || ''), Number(duration) || 30, Math.floor(Math.random() * 2147483647), 8]
    })
  });
  const submitted = await submit.json().catch(() => ({}));
  if (!submit.ok || !submitted.event_id) {
    throw new Error('ACE-Step vocal worker rejected the request.');
  }

  const resultResponse = await fetch(workerUrl + '/gradio_api/call/generate_music/' + encodeURIComponent(submitted.event_id), {
    headers: { Accept: 'text/event-stream' }
  });
  if (!resultResponse.ok) throw new Error('ACE-Step vocal worker status could not be read.');

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
    throw new Error(workerError ? 'ACE-Step vocal worker failed: ' + workerError : 'ACE-Step vocal worker did not return a completed sung track.');
  }

  let value = completed;
  for (let i = 0; i < 5 && typeof value === 'string'; i++) {
    try { value = JSON.parse(value); } catch { break; }
  }
  const first = Array.isArray(value) ? value[0] : value;
  const rawUrl = typeof first === 'string' ? first : first?.url || first?.path;
  if (!rawUrl) throw new Error('ACE-Step vocal worker completed without an audio file.');
  const audioUrl = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : rawUrl.startsWith('/gradio_api/file=') ? workerUrl + rawUrl
      : rawUrl.startsWith('/file=') ? workerUrl + rawUrl
        : rawUrl.startsWith('/tmp/') ? workerUrl + '/file=' + rawUrl
          : workerUrl + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl);
  const audio = await fetch(audioUrl);
  if (!audio.ok) throw new Error('ACE-Step generated the song but the audio file could not be downloaded.');
  const blob = await audio.blob();
  if (!blob.size) throw new Error('ACE-Step returned an empty audio file.');
  return {
    blob,
    mimeType: blob.type || 'audio/wav',
    songId: submitted.event_id,
    provider: 'ACE-Step 1.5 Vocal Worker',
    original: true
  };
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
