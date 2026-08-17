/* BIKEZTAGRAM AI — real cinematic generation runner.
 * Turns a cinematic generation plan into actual generated video blobs using the
 * existing zero-cost worker endpoint. The browser renderer can then treat those
 * blobs as normal media and assemble the final trailer.
 *
 * Important: this module never introduces a paid fallback. A missing worker or
 * failed shot stops the generation job with useful evidence instead of silently
 * substituting procedural video.
 */

import { buildCinematicGenerationPlan } from './cinematicGenerationPlan.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));

function normaliseReferencePayload(referenceAssets = []) {
  return referenceAssets.map((asset, index) => ({
    id: asset?.id || `reference-${index + 1}`,
    type: asset?.type || 'unknown',
    name: asset?.name || `reference-${index + 1}`,
    url: asset?.url || null,
  }));
}

export async function generateCinematicShots({
  brief,
  subject = 'the rider and their motorcycle',
  world = 'original fictional open-world city',
  visualStyle = 'cinematic open-world action trailer',
  durationSeconds = 30,
  aspectRatio = '16:9',
  referenceAssets = [],
  preferredProvider = 'free-gpu',
  endpoint = '/api/generate-free-video',
  fetchImpl = fetch,
  onProgress = () => {},
} = {}) {
  const plan = buildCinematicGenerationPlan({
    brief,
    subject,
    world,
    visualStyle,
    durationSeconds,
    aspectRatio,
    hasReferenceAssets: referenceAssets.length > 0,
    preferredProvider,
  });

  const references = normaliseReferencePayload(referenceAssets);
  const clips = [];

  for (let index = 0; index < plan.shots.length; index += 1) {
    const shot = plan.shots[index];
    onProgress({ stage: 'generating-shot', shotIndex: index, shotCount: plan.shots.length, shotId: shot.id, progress: Math.round((index / plan.shots.length) * 100) });

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: shot.generationPrompt,
        durationSeconds: clamp(shot.durationSeconds, 4, 5),
        aspectRatio: plan.aspectRatio,
        referenceAssets: references,
        continuity: shot.continuity,
        shotId: shot.id,
        zeroCostOnly: true,
      }),
    });

    const contentType = response.headers?.get?.('content-type') || '';
    if (!response.ok || !contentType.includes('video/')) {
      let detail = '';
      try { detail = (await response.text()).slice(0, 1000); } catch {}
      throw new Error(`Cinematic shot ${shot.id} failed: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
    }

    const blob = await response.blob();
    if (!blob.size) throw new Error(`Cinematic shot ${shot.id} returned an empty video.`);

    clips.push({
      id: shot.id,
      file: new File([blob], `${shot.id}.mp4`, { type: contentType || 'video/mp4' }),
      sourceUrl: URL.createObjectURL(blob),
      sourceType: 'generated',
      generated: true,
      generationPrompt: shot.generationPrompt,
      purpose: shot.purpose,
      duration: shot.durationSeconds,
      transition: index === 0 ? 'fade-in' : 'hard-cut',
      motionStyle: 'source-native',
      colorGrade: 'dark-cinematic',
    });

    onProgress({ stage: 'shot-complete', shotIndex: index, shotCount: plan.shots.length, shotId: shot.id, progress: Math.round(((index + 1) / plan.shots.length) * 100) });
  }

  return {
    plan,
    clips,
    mediaItems: clips,
    status: 'generated',
    zeroCostOnly: true,
    playableMp4Required: true,
  };
}

export function releaseGeneratedCinematicClips(result) {
  for (const clip of result?.clips || []) {
    if (clip?.sourceUrl) {
      try { URL.revokeObjectURL(clip.sourceUrl); } catch {}
    }
  }
}
