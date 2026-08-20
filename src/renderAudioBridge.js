/* BIKEZTAGRAM AI — renderer audio bridge.
   Keeps the existing canvas renderer intact while routing optional soundtrack audio
   into the same MediaRecorder capture stream. */

export async function attachPlanAudioToRenderStream(stream, plan, options = {}) {
  const audioUrl = plan?.music?.audioDataUrl || plan?.soundtrack?.audioDataUrl || plan?.audio?.url;
  if (!audioUrl || typeof AudioContext === 'undefined') return { stream, enabled: false, reason: 'no-audio-or-audio-context' };

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx || typeof stream?.addTrack !== 'function') return { stream, enabled: false, reason: 'audio-routing-unavailable' };

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
  // Keep playback audible when supported and route the same signal to MediaRecorder.
  gain.connect(context.destination);

  const track = destination.stream.getAudioTracks()[0];
  if (track) stream.addTrack(track);

  const offset = Math.max(0, Number(plan?.music?.startOffsetSeconds || 0));
  if (offset) {
    try { audio.currentTime = Math.min(offset, Math.max(0, (audio.duration || offset) - 0.01)); } catch {}
  }

  const cleanup = () => {
    try { audio.pause(); } catch {}
    try { source.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
    try { context.close(); } catch {}
    if (track) try { track.stop(); } catch {}
    try { audio.removeAttribute('src'); audio.load(); } catch {}
  };

  return { stream, enabled: true, audio, context, cleanup };
}
