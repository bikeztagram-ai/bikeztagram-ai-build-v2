/* Bridges AI-generated music (with a local original fallback) into the render contract. */
import { buildCompositionRuntime, buildMusicTimeline } from './musicCompositionRuntime.js';
import { planAudioDirector } from './audioDirector.js';
import { createMusicBrief, composeFullMusic, renderMusicWav } from './musicStudioEngine.js';
import { generateAIMusic } from './aiMusicProvider.js';

const blobToDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Could not encode generated music.'));
  reader.readAsDataURL(blob);
});

function wantsVocals(prompt) {
  const text = String(prompt || '');
  return /vocal|vocals|singer|female voice|male voice|lyrics|anthem/i.test(text) && !/instrumental|no vocals|without vocals/i.test(text);
}

function aiMusicPrompt({ creativePrompt, direction, duration }) {
  const vocal = wantsVocals(creativePrompt);
  return [
    'Create an original premium cinematic soundtrack for a motorcycle social film.',
    creativePrompt || 'Dark, powerful, modern motorcycle cinematography with a strong final hero moment.',
    `Approximate length ${Math.round(duration)} seconds.`,
    `Tempo around ${direction.preferredBpm} BPM.`,
    'Strong musical structure with a clear intro, build, peak/drop and satisfying ending.',
    'Professional commercial production, punchy drums, controlled low end, memorable melodic hook, layered instrumentation and dynamic arrangement.',
    vocal ? 'Use expressive original vocals with a strong memorable chorus; do not imitate any artist.' : 'Instrumental only: no lead vocals, no spoken word.',
    'Do not reference or imitate any named artist, existing song, copyrighted lyrics or recognisable recording.'
  ].join(' ');
}

export async function buildMusicRenderBridge({ prompt = '', duration = 15, cuts = [], bpm = 'auto', mood = 'auto', energy = 'auto', key = 'auto', mode = 'auto', onProgress } = {}) {
  const direction = planAudioDirector({ creativePrompt: prompt, duration, cuts });
  const preferredBpm = bpm === 'auto' ? direction.preferredBpm : bpm;
  const composition = buildCompositionRuntime({ prompt, duration, bpm: preferredBpm, mood, energy });
  const timeline = buildMusicTimeline(composition, cuts);
  let audioBlob;
  let provider = 'in-house-procedural-fallback';
  let songId = '';
  try {
    onProgress?.({ stage: 'ai-music', value: 5, provider: 'Eleven Music v2' });
    const generated = await generateAIMusic({
      prompt: aiMusicPrompt({ creativePrompt: prompt, direction, duration }),
      durationMs: Math.max(3000, Math.min(600000, Math.round(duration * 1000))),
      forceInstrumental: !wantsVocals(prompt)
    });
    audioBlob = generated.blob;
    provider = generated.provider || 'Eleven Music v2';
    songId = generated.songId || '';
    onProgress?.({ stage: 'ai-music', value: 100, provider });
  } catch (error) {
    if (!/not configured|provider is not configured/i.test(error?.message || '')) console.warn('[MUSIC] AI provider failed; using local original fallback.', error);
    const studioComposition = composeFullMusic(createMusicBrief({ prompt, duration, bpm: preferredBpm, mood, energy, key, mode }));
    audioBlob = renderMusicWav(studioComposition);
  }
  const audioDataUrl = await blobToDataUrl(audioBlob);
  return {
    version: 'music-render-bridge-v3', direction, composition, timeline,
    renderAudio: {
      enabled: true, originalOnly: true, provider, songId, audioDataUrl,
      audioMimeType: audioBlob.type || (provider === 'Eleven Music v2' ? 'audio/mpeg' : 'audio/wav'),
      beatGrid: composition.events.map(e => e.time),
      impactMarkers: composition.stems.impacts.map(e => e.time),
      duckingDb: direction.mix.voiceoverDuckDb,
      master: { targetLufs: direction.mix.targetLufs, peakDbtp: direction.mix.peakDbtp }
    }
  };
}

export function scoreMusicEditSync(bridge) {
  const rows = bridge?.timeline || [];
  if (!rows.length) return 0;
  const inTolerance = rows.filter(x => Math.abs(Number(x.delta) || 0) <= .14).length;
  return Number((inTolerance / rows.length).toFixed(3));
}
