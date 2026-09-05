/* Bridges AI-generated music (with a local original fallback) into the render contract. */
import { buildCompositionRuntime, buildMusicTimeline } from './musicCompositionRuntime.js';
import { planAudioDirector } from './audioDirector.js';
import { createMusicBrief, composeFullMusic, renderMusicWav } from './musicStudioEngine.js';
import { generateAIMusic } from './aiMusicProvider.js';
import { analyzeAudioBlob } from './aiAudioAnalysis.js';

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
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
    'Create an original professional soundtrack that directly serves the supplied creative brief.',
    creativePrompt || 'Create a cinematic audiovisual piece with a strong opening, evolving middle and satisfying final moment.',
    `Approximate length ${Math.round(duration)} seconds.`,
    `Tempo around ${direction.preferredBpm} BPM where musically appropriate.`,
    'Use a deliberate structure that follows the brief: establish the mood, build anticipation, reach the requested emotional or action peak, then resolve cleanly.',
    'Professional commercial production, intentional rhythm, controlled low end, memorable musical motifs, layered instrumentation and meaningful dynamic variation.',
    vocal ? 'Use expressive original vocals with lyrics and a memorable chorus when the brief calls for them; never imitate an artist.' : 'Instrumental only: no lead vocals, no spoken word.',
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
  let audioAnalysis = null;
  try {
    onProgress?.({ stage: 'ai-music', value: 5, provider: 'Eleven Music v2' });
    const generated = await generateAIMusic({ prompt: aiMusicPrompt({ creativePrompt: prompt, direction, duration }), durationMs: Math.max(3000, Math.min(600000, Math.round(duration * 1000))), forceInstrumental: !wantsVocals(prompt) });
    audioBlob = generated.blob;
    provider = generated.provider || 'Eleven Music v2';
    songId = generated.songId || '';
    audioAnalysis = await analyzeAudioBlob(audioBlob);
    onProgress?.({ stage: 'ai-music', value: 100, provider, audioAnalysisReady: Boolean(audioAnalysis) });
  } catch (error) {
    if (!/not configured|provider is not configured/i.test(error?.message || '')) console.warn('[MUSIC] AI provider failed; using local original fallback.', error);
    const studioComposition = composeFullMusic(createMusicBrief({ prompt, duration, bpm: preferredBpm, mood, energy, key, mode }));
    audioBlob = renderMusicWav(studioComposition);
  }
  const audioDataUrl = await blobToDataUrl(audioBlob);
  const beatGrid = audioAnalysis?.beatGrid?.length ? audioAnalysis.beatGrid : composition.events.map((event) => event.time);
  const impactMarkers = audioAnalysis?.impactMarkers?.length ? audioAnalysis.impactMarkers : composition.stems.impacts.map((event) => event.time);
  return {
    version: 'music-render-bridge-v4', direction, composition, timeline,
    renderAudio: {
      enabled: true, originalOnly: true, provider, songId, audioDataUrl,
      audioMimeType: audioBlob.type || (provider === 'Eleven Music v2' ? 'audio/mpeg' : 'audio/wav'),
      beatGrid, impactMarkers, audioAnalysis,
      duckingDb: direction.mix.voiceoverDuckDb,
      master: { targetLufs: direction.mix.targetLufs, peakDbtp: direction.mix.peakDbtp }
    }
  };
}
export function scoreMusicEditSync(bridge) {
  const rows = bridge?.timeline || [];
  if (!rows.length) return 0;
  const inTolerance = rows.filter((x) => Math.abs(Number(x.delta) || 0) <= .14).length;
  return Number((inTolerance / rows.length).toFixed(3));
}
