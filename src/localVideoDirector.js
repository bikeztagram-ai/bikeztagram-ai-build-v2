function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalisePurpose(value, fallback = 'cinematic') {
  const text = String(value || '').toLowerCase();
  if (text.includes('opening')) return 'opening';
  if (text.includes('reveal')) return 'reveal';
  if (text.includes('action')) return 'action';
  if (text.includes('hero')) return 'hero-ending';
  if (text.includes('detail')) return 'detail';
  if (text.includes('transition')) return 'transition';
  return fallback;
}

function motionForPurpose(purpose, index) {
  if (purpose === 'opening') return 'slow-push';
  if (purpose === 'reveal') return 'pan-right';
  if (purpose === 'action') return index % 2 ? 'pan-left' : 'slow-push';
  if (purpose === 'hero-ending') return 'slow-pull';
  if (purpose === 'detail') return 'slow-push';
  return index % 2 ? 'pan-right' : 'slow-push';
}

function transitionForPurpose(purpose, index, total) {
  if (index === 0) return 'fade-in';
  if (index === total - 1 || purpose === 'hero-ending') return 'fade-out';
  if (purpose === 'transition') return 'flash-cut';
  if (purpose === 'action') return index % 2 ? 'whip-left' : 'whip-right';
  return 'hard-cut';
}

/**
 * Zero-cost local production engine.
 * It converts the director blueprint into executable edit instructions and
 * records generated/procedural scenes without calling another AI service.
 * The proven renderer remains responsible for the actual uploaded-media cuts.
 */
export function buildLocalProductionEdit(analysis, productionPlan, options = {}) {
  const scenes = Array.isArray(productionPlan?.scenes) ? productionPlan.scenes : [];
  const uploadedScenes = scenes.filter((scene) => scene?.sourceType === 'uploaded');
  const generatedScenes = scenes.filter((scene) => scene?.sourceType === 'generated');
  const maxCuts = clamp(numberOr(options.maxCuts, 8), 1, 30);
  const targetDuration = clamp(numberOr(options.targetDuration, 15), 5, 60);
  const sourceDuration = clamp(numberOr(analysis?.durationInSeconds, 11), 1, 600);

  const cuts = [];
  let elapsed = 0;

  uploadedScenes.slice(0, maxCuts).forEach((scene, index) => {
    if (elapsed >= targetDuration) return;
    const purpose = normalisePurpose(scene.purpose, index === 0 ? 'opening' : 'cinematic');
    const sourceStart = clamp(numberOr(scene.startTime, 0), 0, Math.max(0, sourceDuration - 0.1));
    const available = Math.max(0.5, Math.min(sourceDuration - sourceStart, numberOr(scene.endTime, sourceStart + 2) - sourceStart));
    const duration = Math.min(available, targetDuration - elapsed, 5);
    if (duration < 0.5) return;
    cuts.push({
      mediaIndex: 0,
      mediaId: 'video-0',
      startTime: sourceStart,
      duration: Number(duration.toFixed(2)),
      purpose,
      speed: purpose === 'action' ? 1.12 : purpose === 'hero-ending' ? 0.72 : 1,
      transition: transitionForPurpose(purpose, index, uploadedScenes.length),
      motionStyle: motionForPurpose(purpose, index),
      motionIntensity: purpose === 'hero-ending' ? 0.8 : 0.95,
      stabilization: true,
      colorGrade: analysis?.colorGrade || 'dark-cinematic',
      text: index === 0 && purpose === 'opening' ? '' : '',
      textIn: 0.1,
      textOut: 0.88,
      textStyle: 'cinematic'
    });
    elapsed += duration;
  });

  return {
    title: productionPlan?.title || 'Bikeztagram AI Local Director',
    creativeDirection: productionPlan?.creativeDirection || '',
    subjectContinuity: productionPlan?.subjectContinuity || null,
    cuts,
    generatedScenes: generatedScenes.map((scene) => ({
      id: scene.id,
      sourceType: 'generated',
      purpose: normalisePurpose(scene.purpose),
      duration: numberOr(scene.duration, 2),
      generationPrompt: String(scene.generationPrompt || ''),
      continuityNotes: String(scene.continuityNotes || ''),
      status: 'planned-for-local-generation'
    })),
    missingShots: Array.isArray(productionPlan?.missingShots) ? productionPlan.missingShots : [],
    targetDuration,
    source: 'local-zero-cost-director'
  };
}
