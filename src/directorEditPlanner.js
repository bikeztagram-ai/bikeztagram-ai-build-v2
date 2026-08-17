/* BIKEZTAGRAM AI — bridges Director intent into deterministic edit plans. */

import { buildVisualLookPlan } from './visualLookPlan.js';

export function buildDirectorEditPlan({ assets = [], duration = 30, mood = 'cinematic', platform = 'reels', lookId = 'cinematic-natural', music = null, captions = true } = {}) {
  const safeDuration = Math.max(3, Number(duration) || 30);
  const usableAssets = assets.filter(Boolean).map((asset, index) => ({ ...asset, id: asset.id || `asset-${index + 1}` }));
  const look = buildVisualLookPlan({ lookId, consistency: 'locked' });
  const shotCount = Math.max(3, Math.min(12, usableAssets.length || 5));
  const perShot = safeDuration / shotCount;
  return {
    version: 1,
    intent: { mood, platform, duration: safeDuration },
    visualLook: look,
    tracks: {
      video: Array.from({ length: shotCount }, (_, index) => ({ id: `shot-${index + 1}`, assetId: usableAssets[index % Math.max(1, usableAssets.length)]?.id || null, duration: Number(perShot.toFixed(2)), transition: index === 0 ? null : 'cinematic-cut', speed: index === shotCount - 2 ? 1.15 : 1 })),
      music: music ? [{ id: 'music-1', assetId: music.id || music, start: 0, duration: safeDuration }] : [],
      captions: captions ? [{ id: 'captions-1', mode: 'auto', style: 'cinematic', start: 0, duration: safeDuration }] : [],
    },
    finishing: { look, reframe: platform === 'reels' ? '9:16' : '16:9', audioMix: 'auto', quality: 'high' },
  };
}
