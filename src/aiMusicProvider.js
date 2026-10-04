import { getConfiguredMusicEngineUrl, prepareMusicGeneration } from './musicEngineDirector.js';
/* Bikeztagram AI — open-source music generation gateway. */
function providerBaseUrl() {
  return String(import.meta?.env?.VITE_ACE_STEP_API_URL || '').trim().replace(/\/$/, '');
}

async function wakeAndWaitForMusicEngine(baseUrl) {
  const healthUrl = baseUrl + '/health';
  try {
    const current = await fetch(healthUrl, { method: 'GET', cache: 'no-store' });
    if (current.ok) {
      const data = await current.json().catch(() => ({}));
      if (data?.ok) return;
    }
  } catch {}

  const wake = await fetch('/api/music-engine-wake', { method: 'POST' });
  if (!wake.ok) {
    let detail = '';
    try { detail = (await wake.json())?.details || ''; } catch {}
    throw new Error('Bikeztagram Music Engine could not be started.' + (detail ? ' ' + detail : ''));
  }

  const deadline = Date.now() + 90000;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, { method: 'GET', cache: 'no-store' });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data?.ok) return;
        lastError = 'GPU is starting and the MiniMax renderer is still loading.';
      }
    } catch (error) {
      lastError = error?.message || String(error);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Bikeztagram Music Engine did not become ready within 90 seconds.' + (lastError ? ' ' + lastError : ''));
}

async function generateViaOwnMusicEngine({ prompt, lyrics, durationMs, forceInstrumental, bpm, key, mode, vocalLanguage, vocalDirection }) {
  const baseUrl = getConfiguredMusicEngineUrl();
  if (!baseUrl) return null;
  await wakeAndWaitForMusicEngine(baseUrl);
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

export async function generateAIMusic({ prompt, durationMs = 30000, forceInstrumental = false, bpm, key, mode, lyrics = '', vocalLanguage = 'en', vocalDirection = '', sourceAudio = null, referenceAudio = null, taskType = 'text2music', coverStrength = 0.75 } = {}) {
  if (!(sourceAudio instanceof Blob) && !(referenceAudio instanceof Blob)) {
    const ownEngine = getConfiguredMusicEngineUrl();
    if (!ownEngine) throw new Error('Bikeztagram Music Engine is not online yet. the private renderer must be configured before music can be generated.');
    return await generateViaOwnMusicEngine({ prompt, lyrics, durationMs, forceInstrumental, bpm, key, mode, vocalLanguage, vocalDirection });
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
      if (data.hint) detail += ' ' + data.hint;
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
