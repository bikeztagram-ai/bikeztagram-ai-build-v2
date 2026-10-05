import { getConfiguredMusicEngineUrl, prepareMusicGeneration } from './musicEngineDirector.js';
/* Bikeztagram AI — open-source music generation gateway. */
function providerBaseUrl() {
  return String(import.meta?.env?.VITE_ACE_STEP_API_URL || '').trim().replace(/\/$/, '');
}

async function generateViaOwnMusicEngine({ prompt, lyrics, durationMs, forceInstrumental, bpm, key, mode, vocalLanguage, vocalDirection, onProgress }) {
  const baseUrl = getConfiguredMusicEngineUrl();
  if (!baseUrl) return null;
  const prepared = prepareMusicGeneration({
    prompt, lyrics, duration: Number(durationMs) / 1000, bpm, key, mode,
    vocalLanguage, vocalDirection, forceInstrumental
  });
  const submit = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
  const submitData = await submit.json().catch(() => ({}));
  if (!submit.ok || !submitData.jobId) {
    throw new Error('Bikeztagram Music Engine could not start the GPU render.' + (submitData.details ? ' ' + submitData.details : ''));
  }
  const deadline = Date.now() + 90 * 60 * 1000;
  let lastStatus = submitData.status || 'IN_QUEUE';
  onProgress?.({ percent: 5, phase: 'Queued — waiting for a free Kaggle GPU', status: lastStatus, estimated: true });
  let transientFailures = 0;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    let statusResponse;
    let data = {};
    try {
      statusResponse = await fetch(baseUrl + '?jobId=' + encodeURIComponent(submitData.jobId), {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
      });
      data = await statusResponse.json().catch(() => ({}));
      transientFailures = 0;
    } catch (error) {
      transientFailures += 1;
      const waitMs = Math.min(10000, 1500 * transientFailures);
      onProgress?.({
        percent: typeof lastStatus === 'string' && lastStatus === 'IN_PROGRESS' ? 61 : 5,
        phase: 'Reconnecting — checking the GPU render…',
        status: lastStatus,
        estimated: true
      });
      if (transientFailures >= 8) {
        throw new Error('Bikeztagram Music Engine could not reconnect to the render status after several attempts. The GPU job was not duplicated.');
      }
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }
    lastStatus = data.status || lastStatus;
    if (data.status === 'RECOVERING') {
      onProgress?.({ percent: 8, phase: data.phase || 'Recovering the GPU render…', status: data.status, estimated: true });
      continue;
    }
    if (typeof data.progress === 'number') {
      onProgress?.({ percent: Math.max(0, Math.min(100, Math.round(data.progress))), phase: data.phase || 'Rendering…', status: lastStatus, estimated: data.progressEstimated !== false });
    }
    if (!statusResponse.ok) {
      let message = data.error || 'Bikeztagram Music Engine failed while rendering.';
      if (data.details) message += ' ' + data.details;
      throw new Error(message);
    }
    if (data.status === 'COMPLETED') {
      let blob;
      if (data.audioUrl) {
        const audio = await fetch(data.audioUrl, { cache: 'no-store' });
        if (!audio.ok) throw new Error('MiniMax Music 3 finished, but the generated audio could not be downloaded.');
        blob = await audio.blob();
      } else if (data.audioBase64) {
        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        blob = new Blob([bytes], { type: data.mimeType || 'audio/mpeg' });
      } else throw new Error('MiniMax Music 3 completed without returning audio.');
      if (!blob.size) throw new Error('Bikeztagram Music Engine returned an empty audio file.');
      onProgress?.({ percent: 100, phase: 'Complete — your song is ready', status: 'COMPLETED', estimated: false });
      return {
        blob,
        mimeType: data.mimeType || blob.type || 'audio/wav',
        songId: data.songId || submitData.jobId,
        provider: data.provider || 'Bikeztagram Music Engine · MiniMax-Music3',
        original: true,
        generatedLyrics: Boolean(data.generatedLyrics),
        director: prepared
      };
    }
    if (['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(String(data.status))) {
      throw new Error(data.error || 'Private MiniMax Music 3 render failed.');
    }
  }
  throw new Error('Bikeztagram Music Engine is still rendering after 90 minutes (' + lastStatus + '). No duplicate GPU job was submitted.');
}

export async function generateAIMusic({ prompt, durationMs = 30000, forceInstrumental = false, bpm, key, mode, lyrics = '', vocalLanguage = 'en', vocalDirection = '', sourceAudio = null, referenceAudio = null, taskType = 'text2music', coverStrength = 0.75, onProgress } = {}) {
  if (!(sourceAudio instanceof Blob) && !(referenceAudio instanceof Blob)) {
    const ownEngine = getConfiguredMusicEngineUrl();
    if (!ownEngine) throw new Error('Bikeztagram Music Engine is not online yet. the private renderer must be configured before music can be generated.');
    return await generateViaOwnMusicEngine({ prompt, lyrics, durationMs, forceInstrumental, bpm, key, mode, vocalLanguage, vocalDirection, onProgress });
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
