/* Universal production runtime: compiled intent + real AI video enhancement + AI/original music + bounded render QA. */
import { renderInspectImprove } from './renderQualityLoop.js';
import { buildMusicRenderBridge, scoreMusicEditSync } from './musicRenderBridge.js';
import { evaluateRenderAcceptance, chooseRevisionActions } from './renderQualityPolicy.js';
import { enhanceStillCutsWithAIVideo } from './aiVideoEnhancer.js';
import { prepareCreativeContinuity } from './creativeContinuityEngine.js';
import { compileCreativeIntent, mergeCreativeIntent } from './creativeIntentCompiler.js';
import { generationContract } from './mediaGenerationPolicy.js';

export async function renderUniversalProduction({ media = [], mediaItems = null, plan, prompt = '', duration = 15, music = true, outputPreset = 'portrait', onProgress } = {}) {
  if (!plan) throw new Error('A render plan is required.');
  const resolvedMediaItems = Array.isArray(mediaItems) ? mediaItems : media;
  if (!Array.isArray(resolvedMediaItems) || !resolvedMediaItems.length) throw new Error('Universal production render requires media items.');
  onProgress?.({ stage: 'creative-intent', value: 5 });
  const intent = compileCreativeIntent(prompt, { duration, aspectRatio: outputPreset });
  const directedPlan = prepareCreativeContinuity(mergeCreativeIntent(plan, intent), { creativePrompt: prompt, duration });
  let productionMedia = resolvedMediaItems;
  let aiVideo = { generatedCount: 0, provider: 'none' };
  try {
    const enhanced = await enhanceStillCutsWithAIVideo({ mediaItems: resolvedMediaItems, plan: directedPlan, creativePrompt: prompt, outputPreset, onProgress });
    productionMedia = enhanced.mediaItems;
    aiVideo = enhanced;
  } catch (error) { console.warn('[UNIVERSAL RENDER] AI video enhancement unavailable; authentic media retained.', error); }
  for (const item of productionMedia) { const contract = generationContract(item); if (!contract.valid) throw new Error(`Generated media contract failed: ${contract.reason}`); }
  if (aiVideo.generatedCount) onProgress?.({ stage: 'ai-video-complete', value: 100, generatedCount: aiVideo.generatedCount, provider: aiVideo.provider });
  const musicBridge = music ? await buildMusicRenderBridge({ creativePrompt: prompt, duration, cuts: directedPlan.cuts || directedPlan.clips || [], onProgress }) : null;
  const musicAudioUrl = musicBridge?.renderAudio?.audioDataUrl || null;
  const beatGrid = musicBridge?.renderAudio?.beatGrid || [];
  const renderPlan = musicBridge ? { ...directedPlan, audioAnalysis: musicBridge.composition?.events, beatGrid, music: { ...(directedPlan.music || {}), audioDataUrl: musicAudioUrl, audioAnalysis: musicBridge.composition?.events, beatGrid, provider: musicBridge.renderAudio?.provider || 'original-fallback' } } : directedPlan;
  const result = await renderInspectImprove({ mediaItems: productionMedia, plan: renderPlan, expectedDuration: duration, prompt, outputPreset, musicUrl: musicAudioUrl, onProgress });
  const beatSyncScore = musicBridge ? scoreMusicEditSync(musicBridge) : null;
  const policy = evaluateRenderAcceptance({ qa: result?.qa, audioExpected: Boolean(music), audioAttached: Boolean(result?.audioAttached), beatSyncScore });
  return { ...result, plan: renderPlan, creativeIntent: intent, mediaItems: productionMedia, aiVideo, musicBridge, acceptance: policy, revisionActions: chooseRevisionActions(policy), accepted: policy.accepted };
}
