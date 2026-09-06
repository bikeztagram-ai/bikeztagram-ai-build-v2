/* Universal production runtime: prompt understanding + real AI video + AI/original music + bounded render QA. */
import { renderInspectImprove } from './renderQualityLoop.js';
import { buildMusicRenderBridge, scoreMusicEditSync } from './musicRenderBridge.js';
import { evaluateRenderAcceptance, chooseRevisionActions } from './renderQualityPolicy.js';
import { enhanceStillCutsWithAIVideo } from './aiVideoEnhancer.js';
import { generatePromptOnlyVideoCutsParallel } from './promptOnlyVideoBatch.js';
import { prepareCreativeContinuity } from './creativeContinuityEngine.js';
import { compileCreativeIntent, mergeCreativeIntent } from './creativeIntentCompiler.js';
import { generationContract } from './mediaGenerationPolicy.js';
export async function renderUniversalProduction({ media = [], mediaItems = null, plan, prompt = '', duration = 15, music = true, outputPreset = 'portrait', onProgress } = {}) {
  if (!plan) throw new Error('A render plan is required.');
  const suppliedMedia = Array.isArray(mediaItems) ? mediaItems : media;
  onProgress?.({ stage: 'creative-intent', value: 5 });
  const intent = compileCreativeIntent(prompt, { duration, aspectRatio: outputPreset });
  const directedPlan = prepareCreativeContinuity(mergeCreativeIntent(plan, intent), { creativePrompt: prompt, duration });
  let productionMedia = Array.isArray(suppliedMedia) ? suppliedMedia : [];
  let aiVideo = { generatedCount: 0, attemptedCount: 0, failedCount: 0, provider: 'none' };
  if (productionMedia.length) {
    try {
      const enhanced = await enhanceStillCutsWithAIVideo({ mediaItems: productionMedia, plan: directedPlan, creativePrompt: prompt, outputPreset, onProgress });
      productionMedia = enhanced.mediaItems;
      aiVideo = enhanced;
    } catch (error) {
      console.warn('[UNIVERSAL RENDER] Reference-video enhancement unavailable; authentic media retained.', error);
    }
  } else {
    const generated = await generatePromptOnlyVideoCutsParallel({ plan: directedPlan, creativePrompt: prompt, outputPreset, concurrency: 3, onProgress });
    productionMedia = generated.mediaItems;
    aiVideo = generated;
  }
  if (!productionMedia.length) throw new Error('No playable production media was created. Configure the AI video provider or add source media.');
  for (const item of productionMedia) {
    const contract = generationContract(item);
    if (!contract.valid) throw new Error(`Generated media contract failed: ${contract.reason}`);
  }
  if (aiVideo.generatedCount) onProgress?.({ stage: 'ai-video-complete', value: 100, generatedCount: aiVideo.generatedCount, provider: aiVideo.provider });
  const cuts = directedPlan.cuts || directedPlan.clips || [];
  const musicBridge = music ? await buildMusicRenderBridge({ prompt, duration, cuts, onProgress }) : null;
  const musicAudioUrl = musicBridge?.renderAudio?.audioDataUrl || null;
  const beatGrid = musicBridge?.renderAudio?.beatGrid || [];
  const audioAnalysis = musicBridge?.renderAudio?.audioAnalysis || null;
  const renderPlan = musicBridge ? { ...directedPlan, audioAnalysis, beatGrid, music: { ...(directedPlan.music || {}), audioDataUrl: musicAudioUrl, audioAnalysis, beatGrid, impactMarkers: musicBridge.renderAudio?.impactMarkers || [], provider: musicBridge.renderAudio?.provider || 'original-fallback' } } : directedPlan;
  const result = await renderInspectImprove({ mediaItems: productionMedia, plan: renderPlan, expectedDuration: duration, prompt, outputPreset, musicUrl: musicAudioUrl, onProgress });
  const beatSyncScore = musicBridge ? scoreMusicEditSync(musicBridge, cuts) : null;
  const policy = evaluateRenderAcceptance({ qa: result?.qa, audioExpected: Boolean(music), audioAttached: Boolean(result?.audioAttached), beatSyncScore });
  return { ...result, plan: renderPlan, creativeIntent: intent, mediaItems: productionMedia, aiVideo, musicBridge, acceptance: policy, revisionActions: chooseRevisionActions(policy), accepted: policy.accepted };
}
