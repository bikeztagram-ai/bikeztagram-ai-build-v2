/* BIKEZTAGRAM AI — renderer audio bridge.
   Routes the soundtrack into MediaRecorder and keeps source-media timing separate
   from editorial/music timing so beat-sync never seeks real footage to a music beat. */

function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function nearestBeat(time, beats) { if (!beats.length) return time; let best = beats[0]; let distance = Math.abs(time - best.time); for (const beat of beats) { const d = Math.abs(time - beat.time); if (d < distance) { best = beat; distance = d; } } return best; }

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
    const originalTimelineEnd = timelineCursor + originalDuration;
    const startBeat = nearestBeat(timelineCursor, sorted);
    const targetEnd = Math.min(maxTime, Math.max(timelineCursor + .5, originalTimelineEnd));
    let endBeat = nearestBeat(targetEnd, sorted);
    if (endBeat.time <= timelineCursor + .5) endBeat = sorted.find(b => b.time >= timelineCursor + .5) || endBeat;
    const clampedEnd = Math.min(maxTime, Math.max(timelineCursor + .5, endBeat.time));
    const duration = Number(Math.max(.5, clampedEnd - timelineCursor).toFixed(3));
    const timelineStart = Number(timelineCursor.toFixed(3));
    const timelineEnd = Number((timelineCursor + duration).toFixed(3));
    timelineCursor = timelineEnd;

    return {
      ...cut,
      startTime: sourceStart,
      sourceStartTime: sourceStart,
      duration,
      endTime: Number((sourceStart + duration).toFixed(3)),
      timelineStartTime: timelineStart,
      timelineEndTime: timelineEnd,
      music: {
        ...(cut.music || {}),
        beatAligned: true,
        startBeat: startBeat.index,
        endBeat: endBeat.index,
        startBeatTime: startBeat.time,
        endBeatTime: endBeat.time,
        syncSource: plan?.music?.audioAnalysis?.analysis || 'planned-beat-grid'
      }
    };
  });

  plan.cuts = syncedCuts;
  plan.music = { ...(plan.music || {}), beatSyncApplied: true, beatSyncSource: plan?.music?.audioAnalysis?.analysis || 'planned-beat-grid' };
  plan.musicTimeline = { version: 'beat-timeline-v2', duration: Number(timelineCursor.toFixed(3)), sourceOffsetsPreserved: true };
  return { plan, enabled: true, beats: sorted.length };
}

export async function attachPlanAudioToRenderStream(stream, plan, options = {}) {
  const sync = applyAudioBeatSyncToPlan(plan);
  const renderPlan = sync.plan;
  const audioUrl = renderPlan?.music?.audioDataUrl || renderPlan?.soundtrack?.audioDataUrl || renderPlan?.audio?.url;
  if (!audioUrl || typeof window === 'undefined') return { stream, plan: renderPlan, enabled: false, beatSync: sync.enabled, reason: 'no-audio-or-window' };
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx || typeof stream?.addTrack !== 'function') return { stream, plan: renderPlan, enabled: false, beatSync: sync.enabled, reason: 'audio-routing-unavailable' };

  const context = new AudioCtx();
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.src = audioUrl;
  audio.preload = 'auto';
  audio.loop = false;

  await new Promise((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('Generated soundtrack could not be decoded for rendering.')); };
    const cleanup = () => { audio.removeEventListener('canplay', done); audio.removeEventListener('error', fail); };
    audio.addEventListener('canplay', done, { once: true });
    audio.addEventListener('error', fail, { once: true });
    audio.load();
  });

  const source = context.createMediaElementSource(audio);
  const destination = context.createMediaStreamDestination();
  const gain = context.createGain();
  gain.gain.value = Number.isFinite(Number(options.gain)) ? Number(options.gain) : 1;
  source.connect(gain);
  gain.connect(destination);
  gain.connect(context.destination);
  const track = destination.stream.getAudioTracks()[0];
  if (track) stream.addTrack(track);

  const offset = Math.max(0, Number(renderPlan?.music?.startOffsetSeconds || 0));
  if (offset) {
    try { audio.currentTime = Math.min(offset, Math.max(0, (audio.duration || offset) - 0.01)); } catch {}
  }

  try { await context.resume(); } catch {}
  try { await audio.play(); } catch (error) {
    try { source.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
    try { context.close(); } catch {}
    if (track) try { track.stop(); } catch {}
    return { stream, plan: renderPlan, enabled: false, beatSync: sync.enabled, reason: `audio-playback-blocked: ${error?.message || String(error)}` };
  }

  const cleanup = () => {
    try { audio.pause(); } catch {}
    try { source.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
    try { context.close(); } catch {}
    if (track) try { track.stop(); } catch {}
    try { audio.removeAttribute('src'); audio.load(); } catch {}
  };
  return { stream, plan: renderPlan, enabled: true, beatSync: sync.enabled, audio, context, cleanup };
}
