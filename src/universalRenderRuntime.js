/* Universal production runtime: real AI video enhancement + AI/original music + bounded render QA. */
import { renderInspectImprove } from './renderQualityLoop.js';
import { buildMusicRenderBridge, scoreMusicEditSync } from './musicRenderBridge.js';
import { evaluateRenderAcceptance, chooseRevisionActions } from './renderQualityPolicy.js';
import { enhanceStillCutsWithAIVideo } from './aiVideoEnhancer.js';

export async function renderUniversalProduction({
  media = [], mediaItems = null, plan, prompt = '', duration = 15, music = true,
  outputPreset = 'portrait', onProgress
} = {}) {
  if (!plan) throw new Error('A render plan is required.');
  const resolvedMediaItems = Array.isArray(mediaItems) ? mediaItems : media;
  if (!Array.isArray(resolvedMediaItems) || !resolvedMediaItems.length) throw new Error('Universal production render requires media items.');

  let productionMedia = resolvedMediaItems;
  let aiVideo = { generatedCount: 0, provider: 'none' };
  try {
    const enhanced = await enhanceStillCutsWithAIVideo({
      mediaItems: resolvedMediaItems,
      plan,
      creativePrompt: prompt,
      onProgress
    });
    productionMedia = enhanced.mediaItems;
    aiVideo = enhanced;
  } catch (error) {
    console.warn('[UNIVERSAL RENDER] AI video enhancement unavailable; authentic media retained.', error);
  }

  if (aiVideo.generatedCount) {
    onProgress?.({ stage: 'ai-video-complete', value: 100, generatedCount: aiVideo.generatedCount, provider: aiVideo.provider });
  }

  const musicBridge = music
    ? await buildMusicRenderBridge({ creativePrompt: prompt, duration, cuts: plan.cuts || plan.clips || [], onProgress })
    : null;
  const musicAudioUrl = musicBridge?.renderAudio?.audioDataUrl || null;
  const renderPlan = musicBridge
    ? {
        ...plan,
        audioAnalysis: musicBridge.composition?.events,
        beatGrid: musicBridge.beatGrid,
        music: {
          ...(plan.music || {}),
          audioDataUrl: musicAudioUrl,
          audioAnalysis: musicBridge.composition?.events,
          beatGrid: musicBridge.beatGrid,
          provider: musicBridge.renderAudio?.provider || 'original-fallback'
        }
      }
    : plan;

  const result = await renderInspectImprove({
    mediaItems: productionMedia,
    plan: renderPlan,
    expectedDuration: duration,
    prompt,
    outputPreset,
    musicUrl: musicAudioUrl,
    onProgress
  });
  const beatSyncScore = musicBridge ? scoreMusicEditSync(musicBridge) : null;
  const policy = evaluateRenderAcceptance({
    qa: result?.qa,
    audioExpected: Boolean(music),
    audioAttached: Boolean(result?.audioAttached),
    beatSyncScore
  });
  return {
    ...result,
    mediaItems: productionMedia,
    aiVideo,
    musicBridge,
    acceptance: policy,
    revisionActions: chooseRevisionActions(policy),
    accepted: policy.accepted
  };
}
