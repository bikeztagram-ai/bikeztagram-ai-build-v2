/* BIKEZTAGRAM AI — renderer audio bridge.
   Routes the soundtrack into MediaRecorder and, when real audio analysis is present,
   snaps editorial cut boundaries to detected musical events without changing source-media offsets. */

function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function nearestBeat(time, beats) { if (!beats.length) return time; let best = beats[0]; let distance = Math.abs(time - best.time); for (const beat of beats) { const d = Math.abs(time - beat.time); if (d < distance) { best = beat; distance = d; } } return best; }

export function applyAudioBeatSyncToPlan(plan) {
  const beats = plan?.music?.audioAnalysis?.beats || plan?.soundtrack?.audioAnalysis?.beats || plan?.music?.beatGrid?.beats || plan?.soundtrack?.beatGrid?.beats || [];
  if (!Array.isArray(beats) || beats.length < 2 || !Array.isArray(plan?.cuts) || !plan.cuts.length) return { plan, enabled: false, reason: 'no-audio-beat-grid' };
  const maxTime = number(plan?.music?.audioAnalysis?.duration, plan?.music?.duration || plan?.targetDuration || 600);
  const sorted = beats.map((b, index) => ({ ...b, index: Number.isInteger(b.index) ? b.index : index, time: number(b.time, 0) })).filter(b => b.time >= 0 && b.time <= maxTime).sort((a, b) => a.time - b.time);
  if (sorted.length < 2) return { plan, enabled: false, reason: 'insufficient-beats' };
  const syncedCuts = plan.cuts.map((cut) => {
    const originalStart = number(cut.startTime, 0), originalDuration = Math.max(.5, number(cut.duration, 1)), originalEnd = originalStart + originalDuration;
    const startBeat = nearestBeat(originalStart, sorted); let endBeat = nearestBeat(originalEnd, sorted); const minimumEnd = startBeat.time + .5;
    if (endBeat.time < minimumEnd) endBeat = sorted.find(b => b.time >= minimumEnd) || endBeat;
    const clampedEnd = Math.min(maxTime, Math.max(minimumEnd, endBeat.time));
    return { ...cut, startTime: Number(startBeat.time.toFixed(3)), duration: Number(Math.max(.5, clampedEnd - startBeat.time).toFixed(3)), endTime: Number(clampedEnd.toFixed(3)), sourceStartTime: cut.sourceStartTime ?? cut.startTime, music: { ...(cut.music || {}), beatAligned: true, startBeat: startBeat.index, endBeat: endBeat.index, startBeatTime: startBeat.time, endBeatTime: endBeat.time, syncSource: plan?.music?.audioAnalysis?.analysis || 'planned-beat-grid' } };
  });
  return { plan: { ...plan, cuts: syncedCuts, music: { ...(plan.music || {}), beatSyncApplied: true, beatSyncSource: plan?.music?.audioAnalysis?.analysis || 'planned-beat-grid' } }, enabled: true, beats: sorted.length };
}

export async function attachPlanAudioToRenderStream(stream, plan, options = {}) {
  const sync = applyAudioBeatSyncToPlan(plan); const renderPlan = sync.plan;
  const audioUrl = renderPlan?.music?.audioDataUrl || renderPlan?.soundtrack?.audioDataUrl || renderPlan?.audio?.url;
  if (!audioUrl || typeof AudioContext === 'undefined') return { stream, plan: renderPlan, enabled: false, beatSync: sync.enabled, reason: 'no-audio-or-audio-context' };
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx || typeof stream?.addTrack !== 'function') return { stream, plan: renderPlan, enabled: false, beatSync: sync.enabled, reason: 'audio-routing-unavailable' };
  const context = new AudioCtx(), audio = new Audio(); audio.crossOrigin = 'anonymous'; audio.src = audioUrl; audio.preload = 'auto'; audio.loop = false;
  await new Promise((resolve, reject) => { const done = () => { cleanup(); resolve(); }; const fail = () => { cleanup(); reject(new Error('Generated soundtrack could not be decoded for rendering.')); }; const cleanup = () => { audio.removeEventListener('canplay', done); audio.removeEventListener('error', fail); }; audio.addEventListener('canplay', done, { once: true }); audio.addEventListener('error', fail, { once: true }); audio.load(); });
  const source = context.createMediaElementSource(audio), destination = context.createMediaStreamDestination(), gain = context.createGain(); gain.gain.value = Number.isFinite(Number(options.gain)) ? Number(options.gain) : 1; source.connect(gain); gain.connect(destination); gain.connect(context.destination);
  const track = destination.stream.getAudioTracks()[0]; if (track) stream.addTrack(track);
  const offset = Math.max(0, Number(renderPlan?.music?.startOffsetSeconds || 0)); if (offset) { try { audio.currentTime = Math.min(offset, Math.max(0, (audio.duration || offset) - 0.01)); } catch {} }
  const cleanup = () => { try { audio.pause(); } catch {} try { source.disconnect(); } catch {} try { gain.disconnect(); } catch {} try { context.close(); } catch {} if (track) try { track.stop(); } catch {} try { audio.removeAttribute('src'); audio.load(); } catch {} };
  return { stream, plan: renderPlan, enabled: true, beatSync: sync.enabled, audio, context, cleanup };
}
