/* Bikeztagram AI — open-source music generation gateway. */
function providerBaseUrl() {
  return String(import.meta?.env?.VITE_ACE_STEP_API_URL || '').trim().replace(/\/$/, '');
}

export async function generateAIMusic({ prompt, durationMs = 30000, forceInstrumental = false, bpm, key, mode, lyrics = '', vocalLanguage = 'en', vocalDirection = '', sourceAudio = null, taskType = 'text2music', coverStrength = 0.75 } = {}) {
  const hasSource = sourceAudio instanceof Blob;
  const requestBody = hasSource ? (() => { const form = new FormData(); form.append('prompt', String(prompt || '').trim()); form.append('durationMs', String(durationMs)); form.append('forceInstrumental', String(Boolean(forceInstrumental))); if (bpm != null) form.append('bpm', String(bpm)); if (key) form.append('key', String(key)); if (mode) form.append('mode', String(mode)); if (lyrics) form.append('lyrics', String(lyrics)); form.append('taskType', String(taskType || 'cover')); form.append('coverStrength', String(coverStrength)); form.append('vocalLanguage', String(vocalLanguage || 'en')); if (vocalDirection) form.append('vocalDirection', String(vocalDirection)); form.append('sourceAudio', sourceAudio, sourceAudio.name || 'source-audio'); return form; })() : JSON.stringify({ prompt: String(prompt || '').trim(), durationMs, forceInstrumental, bpm, key, mode, timeSignature: mode, lyrics, vocalLanguage, vocalDirection, taskType, coverStrength });
  const response = await fetch('/api/music', {
    method: 'POST',
    ...(hasSource ? {} : { headers: { 'Content-Type': 'application/json' } }),
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
