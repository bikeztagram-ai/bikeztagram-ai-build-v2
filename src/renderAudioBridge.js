/* BIKEZTAGRAM AI — renderer audio bridge.
   Protected visual renderer contract: this module only adds generated/original
   soundtrack audio to the existing MediaRecorder stream. Source-media timing
   remains separate from editorial/music timing. */

function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function nearestBeat(time, beats) { if (!beats.length) return time; let best = beats[0]; let distance = Math.abs(time - best.time); for (const beat of beats) { const d = Math.abs(time - beat.time); if (d < distance) { best = beat; distance = d; } } return best; }
function nextBeatAfter(time, beats, minimumGap = 0.5) { return beats.find((beat) => beat.time >= time + minimumGap) || null; }

export function applyAudioBeatSyncToPlan(plan) {
  const beats = plan?.music?.audioAnalysis?.beats || plan?.soundtrack?.audioAnalysis?.beats || plan?.music?.beatGrid?.beats || plan?.soundtrack?.beatGrid?.beats || [];
  if (!Array.isArray(beats) || beats.length < 2 || !Array.isArray(plan?.cuts) || !plan.cuts.length) return { plan, enabled: false, reason: 'no-audio-beat-grid' };
  const maxTime = number(plan?.music?.audioAnalysis?.duration, plan?.music?.duration || plan?.targetDuration || 600);
  const sorted = beats.map((b, index) => ({ ...b, index: Number.isInteger(b.index) ? b.index : index, time: number(b.time, 0) })).filter(b => b.time >= 0 && b.time <= maxTime).sort((a, b) => a.time - b.time);
  if (sorted.length < 2) return { plan, enabled: false, reason: 'insufficient-beats' };

  let timelineCursor = 0;
  const syncedCuts = plan.cuts.map((cut) => {
    const sourceStart = number(cut.sourceStartTime ?? cut.startTime, 0);
    const originalDuration = Math.max(.5, number(cut.duration, 1));
    const requestedStart = timelineCursor;
    const startBeat = nearestBeat(requestedStart, sorted);
    // Snap the editorial start itself to the beat. The previous implementation
    // only snapped the end, which meant cuts were labelled beat-aligned while
    // actually beginning between beats.
    const timelineStart = Math.min(maxTime, Math.max(0, startBeat.time));
    const requestedEnd = timelineStart + originalDuration;
    let endBeat = nearestBeat(requestedEnd, sorted);
    const followingBeat = nextBeatAfter(timelineStart, sorted, .5);
    if (followingBeat && Math.abs(endBeat.time - requestedEnd) > Math.abs(followingBeat.time - requestedEnd)) endBeat = followingBeat;
    if (endBeat.time <= timelineStart + .5) endBeat = followingBeat || endBeat;
    const clampedEnd = Math.min(maxTime, Math.max(timelineStart + .5, endBeat.time));
    const duration = Number(Math.max(.5, clampedEnd - timelineStart).toFixed(3));
    const timelineStartTime = Number(timelineStart.toFixed(3));
    const timelineEndTime = Number((timelineStart + duration).toFixed(3));
    timelineCursor = timelineEndTime;
    return { ...cut, startTime: sourceStart, sourceStartTime: sourceStart, duration, endTime: Number((sourceStart + duration).toFixed(3)), timelineStartTime, timelineEndTime, music: { ...(cut.music || {}), beatAligned: true, startBeat: startBeat.index, endBeat: endBeat.index, startBeatTime: startBeat.time, endBeatTime: endBeat.time, syncSource: plan?.music?.audioAnalysis?.analysis || 'planned-beat-grid' } };
  });
  plan.cuts = syncedCuts;
  plan.music = { ...(plan.music || {}), beatSyncApplied: true, beatSyncSource: plan?.music?.audioAnalysis?.analysis || 'planned-beat-grid' };
  plan.musicTimeline = { version: 'beat-timeline-v3', duration: Number(timelineCursor.toFixed(3)), sourceOffsetsPreserved: true, startsSnappedToBeats: true };
  return { plan, enabled: true, beats: sorted.length };
}

function isDataLike(url) { return /^data:audio\//i.test(String(url || '')); }
async function waitForAudioElement(audio) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Generated soundtrack did not become playable within 10 seconds.')), 10000);
    const done = () => { clearTimeout(timeout); cleanup(); resolve(); };
    const fail = () => { clearTimeout(timeout); cleanup(); reject(new Error(`Generated soundtrack could not be decoded (MediaError code=${audio.error?.code ?? 'unknown'}).`)); };
    const cleanup = () => { audio.removeEventListener('canplay', done); audio.removeEventListener('loadeddata', done); audio.removeEventListener('error', fail); };
    audio.addEventListener('canplay', done, { once: true }); audio.addEventListener('loadeddata', done, { once: true }); audio.addEventListener('error', fail, { once: true }); audio.load();
  });
}
async function attachDecodedAudio(context, audioUrl, stream, options) {
  const response = await fetch(audioUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Generated soundtrack fetch failed: HTTP ${response.status}.`);
  const arrayBuffer = await response.arrayBuffer(); if (!arrayBuffer.byteLength) throw new Error('Generated soundtrack is empty.');
  const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0)); if (!audioBuffer?.duration) throw new Error('Generated soundtrack decoded with no duration.');
  const destination = context.createMediaStreamDestination(); const source = context.createBufferSource(); const gain = context.createGain();
  gain.gain.value = Number.isFinite(Number(options?.gain)) ? Number(options.gain) : 1; source.buffer = audioBuffer; source.connect(gain); gain.connect(destination);
  const track = destination.stream.getAudioTracks()[0]; if (!track) throw new Error('Decoded soundtrack produced no MediaStream audio track.');
  stream.addTrack(track); await context.resume(); if (context.state !== 'running') throw new Error(`Audio context did not start (state: ${context.state}).`);
  const offset = Math.max(0, number(options?.offset, 0)); source.start(0, Math.min(offset, Math.max(0, audioBuffer.duration - 0.01)));
  return { source, track, duration: audioBuffer.duration, destination, cleanup: () => { try { source.stop(); } catch {} try { source.disconnect(); } catch {} try { gain.disconnect(); } catch {} try { track.stop(); } catch {} } };
}
export async function attachPlanAudioToRenderStream(stream, plan, options = {}) {
  const sync = applyAudioBeatSyncToPlan(plan); const renderPlan = sync.plan;
  const audioUrl = renderPlan?.music?.audioDataUrl || renderPlan?.soundtrack?.audioDataUrl || renderPlan?.audio?.url;
  if (!audioUrl || typeof window === 'undefined') return { stream, plan: renderPlan, enabled: false, beatSync: sync.enabled, reason: 'no-audio-or-window' };
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx || typeof stream?.addTrack !== 'function') return { stream, plan: renderPlan, enabled: false, beatSync: sync.enabled, reason: 'audio-routing-unavailable' };
  const context = new AudioCtx(); let decoded = null;
  try { if (isDataLike(audioUrl)) decoded = await attachDecodedAudio(context, audioUrl, stream, options); }
  catch (decodedError) { console.warn('[AUDIO] Direct generated-audio decode failed; trying media-element fallback.', decodedError); try { await context.close(); } catch {} return attachPlanAudioToRenderStreamViaElement(stream, renderPlan, options); }
  if (decoded) return { stream, plan: renderPlan, enabled: true, beatSync: sync.enabled, audio: null, context, cleanup: () => { decoded.cleanup(); try { context.close(); } catch {} } };
  try { await context.close(); } catch {} return attachPlanAudioToRenderStreamViaElement(stream, renderPlan, options);
}
async function attachPlanAudioToRenderStreamViaElement(stream, renderPlan, options = {}) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext; const audioUrl = renderPlan?.music?.audioDataUrl || renderPlan?.soundtrack?.audioDataUrl || renderPlan?.audio?.url;
  if (!AudioCtx || !audioUrl) return { stream, plan: renderPlan, enabled: false, beatSync: Boolean(renderPlan?.music?.beatSyncApplied), reason: 'audio-routing-unavailable' };
  const context = new AudioCtx(); const audio = new Audio(); audio.crossOrigin = 'anonymous'; audio.src = audioUrl; audio.preload = 'auto'; audio.loop = false;
  try {
    await waitForAudioElement(audio); const source = context.createMediaElementSource(audio); const destination = context.createMediaStreamDestination(); const gain = context.createGain();
    gain.gain.value = Number.isFinite(Number(options.gain)) ? Number(options.gain) : 1; source.connect(gain); gain.connect(destination);
    const track = destination.stream.getAudioTracks()[0]; if (!track) throw new Error('Generated soundtrack produced no MediaStream audio track.');
    stream.addTrack(track); const offset = Math.max(0, number(options.offset, 0)); if (offset) audio.currentTime = Math.min(offset, Math.max(0, (audio.duration || offset) - .01));
    await context.resume(); if (context.state !== 'running') throw new Error(`Audio context did not start (state: ${context.state}).`); await audio.play();
    return { stream, plan: renderPlan, enabled: true, beatSync: Boolean(renderPlan?.music?.beatSyncApplied), audio, context, cleanup: () => { try { audio.pause(); } catch {} try { source.disconnect(); } catch {} try { gain.disconnect(); } catch {} try { track.stop(); } catch {} try { context.close(); } catch {} try { audio.removeAttribute('src'); audio.load(); } catch {} } };
  } catch (error) { try { context.close(); } catch {} return { stream, plan: renderPlan, enabled: false, beatSync: Boolean(renderPlan?.music?.beatSyncApplied), reason: error?.message || String(error) }; }
}
