/* BIKEZTAGRAM AI — render audio bus
 * Keeps audio optional and local. The current free-first pulse is generated in-browser;
 * no copyrighted catalogue or Blob/Gemini configuration is involved.
 */

import { createOriginalPulseWav } from './musicProvider.js';

export async function createRenderAudioBus(plan, durationSeconds = 15) {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;

  const mode = String(plan?.audio?.mode || 'original-local').toLowerCase();
  if (mode === 'none' || mode === 'silent') return null;

  const bpm = Number(plan?.audio?.bpm || plan?.bpm || 112);
  const wav = createOriginalPulseWav(Math.max(1, durationSeconds + 0.5), bpm);
  const url = URL.createObjectURL(wav);
  const audio = document.createElement('audio');
  audio.src = url;
  audio.preload = 'auto';
  audio.crossOrigin = '';
  audio.loop = false;

  const context = new AudioContext();
  const source = context.createMediaElementSource(audio);
  const destination = context.createMediaStreamDestination();
  const gain = context.createGain();
  gain.gain.value = Number.isFinite(Number(plan?.audio?.gain)) ? Math.max(0, Math.min(1, Number(plan.audio.gain))) : 0.72;
  source.connect(gain);
  gain.connect(destination);

  await new Promise((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('Could not prepare render audio.')); };
    const cleanup = () => {
      audio.removeEventListener('canplaythrough', done);
      audio.removeEventListener('error', fail);
    };
    audio.addEventListener('canplaythrough', done, { once: true });
    audio.addEventListener('error', fail, { once: true });
    audio.load();
  });

  return {
    audio,
    stream: destination.stream,
    context,
    durationSeconds,
    bpm,
    start: async () => {
      if (context.state === 'suspended') await context.resume();
      audio.currentTime = 0;
      await audio.play();
    },
    stop: async () => {
      audio.pause();
      try { await context.close(); } catch {}
      URL.revokeObjectURL(url);
    }
  };
}
