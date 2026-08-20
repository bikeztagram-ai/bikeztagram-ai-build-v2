/* BIKEZTAGRAM AI — world-scene stability policy
   Kept separate from the large compositor so the protected renderer can be
   advanced without replacing the full worldScene.js file. */

export const WORLD_SCENE_FPS = 30;
export const WORLD_SCENE_MIN_DURATION = 0.75;
export const WORLD_SCENE_MAX_DURATION = 30;
export const WORLD_SCENE_SHAKE = Object.freeze({ establishing: 0.18, action: 0.42, hero: 0.12 });

export function normaliseWorldSceneDuration(value, fallback = 8) {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) return fallback;
  return Math.max(WORLD_SCENE_MIN_DURATION, Math.min(WORLD_SCENE_MAX_DURATION, duration));
}

export function worldSceneFrameState(elapsedMs, durationSeconds) {
  const duration = normaliseWorldSceneDuration(durationSeconds);
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  const progress = Math.max(0, Math.min(1, elapsed / (duration * 1000)));
  const shot = progress < 0.34 ? 0 : progress < 0.70 ? 1 : 2;
  const local = shot === 0 ? progress / 0.34 : shot === 1 ? (progress - 0.34) / 0.36 : (progress - 0.70) / 0.30;
  return { duration, progress, shot, localProgress: Math.max(0, Math.min(1, local)), complete: progress >= 1 };
}

export function worldSceneMotionAmplitude(shot, intensity = 1) {
  const base = shot === 1 ? WORLD_SCENE_SHAKE.action : shot === 2 ? WORLD_SCENE_SHAKE.hero : WORLD_SCENE_SHAKE.establishing;
  const safeIntensity = Number.isFinite(Number(intensity)) ? Math.max(0, Math.min(1, Number(intensity))) : 1;
  return base * safeIntensity;
}

export function isWorldSceneSourceReady(video) {
  return Boolean(video && video.readyState >= 2 && Number.isFinite(video.duration) && video.duration > 0 && video.videoWidth > 0 && video.videoHeight > 0);
}
