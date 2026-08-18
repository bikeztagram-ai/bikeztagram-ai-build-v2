/* BIKEZTAGRAM AI — AI Director production blueprint.
   Product layer only. Blob/Gemini upload + analysis configuration remain untouched.
   This layer converts Gemini's real-media analysis + the user's creative prompt into
a deterministic, zero-cost production plan for Bikeztagram's own browser compositor.
*/

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function text(value) { return String(value || '').trim(); }

function allBestMoments(analysis) {
  return (Array.isArray(analysis?.bestMoments) ? analysis.bestMoments : [])
    .filter((m) => m && m.start != null && m.end != null)
    .map((m) => ({ start: Number(m.start), end: Number(m.end), description: text(m.description), score: Number(m.score || 0) }))
    .filter((m) => Number.isFinite(m.start) && Number.isFinite(m.end) && m.end > m.start)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

function detectWorld(prompt) {
  const p = text(prompt).toLowerCase();
  if (/mars|red planet|martian|alien planet/.test(p)) return 'mars';
  if (/gta|grand theft|open world|crime|street race|neon city|night city/.test(p)) return 'neon-city';
  if (/drone|drones|pursuit|chase|military/.test(p)) return 'drone-chase';
  if (/desert|dust|sand/.test(p)) return 'desert';
  if (/future|futuristic|sci-fi|cyber/.test(p)) return 'future';
  return 'cinematic-world';
}

function detectStyle(prompt) {
  const p = text(prompt).toLowerCase();
  return {
    action: /action|race|chase|pursuit|fast|speed|aggressive/.test(p),
    trailer: /trailer|blockbuster|movie|cinematic|epic/.test(p),
    dark: /dark|moody|night|dramatic/.test(p),
    sparks: /spark|sparks|fire|explosion/.test(p),
    dust: /dust|sand|desert|mars/.test(p),
    neon: /neon|cyber|future|futuristic|city/.test(p),
    drones: /drone|drones|pursuit/.test(p)
  };
}

function subjectContinuity(analysis) {
  const subject = text(analysis?.subject?.description) || text(analysis?.subject?.motorcycleModel) || 'the uploaded motorcycle';
  return {
    primarySubject: subject,
    motorcycleModel: text(analysis?.subject?.motorcycleModel),
    motorcycleVisible: analysis?.subject?.motorcycleVisible !== false,
    riderVisible: analysis?.subject?.riderVisible === true,
    sourceOfTruth: 'The supplied media is authoritative for motorcycle identity, colour, geometry, proportions and real motion.',
    preservationRules: [
      'Keep the motorcycle recognisable and visually consistent across every shot.',
      'Do not replace the real motorcycle with a generic generated motorcycle.',
      'Match generated lighting, perspective, scale and atmosphere to the supplied footage.',
      'Use generated material to extend or surround the real footage rather than silently discarding the source subject.'
    ]
  };
}

function generatedPrompt({ creativeRequest, subject, world, style, purpose }) {
  const effects = [style.dust ? 'physically convincing dust and airborne particles' : '', style.sparks ? 'controlled sparks and tiny embers' : '', style.neon ? 'cinematic neon reflections and atmospheric haze' : '', style.drones ? 'original autonomous pursuit drones' : '', style.action ? 'dynamic motion, speed and camera energy' : '', style.trailer ? 'premium blockbuster trailer cinematography' : 'cinematic social-video cinematography'].filter(Boolean).join(', ');
  return [`Create an ORIGINAL ${world} environment for ${subject}.`, `Purpose: ${purpose}.`, `User creative request: ${creativeRequest}.`, `Visual direction: ${effects || 'cinematic atmosphere and realistic environmental detail'}.`, 'Preserve the motorcycle as the primary subject and maintain continuity with the supplied media.', 'Match perspective, camera direction, scale, contact with the ground, lighting direction and motion blur to the source.', 'Generate original visual material only; do not reproduce copyrighted characters, logos, vehicles, scenes, dialogue or soundtrack from a named franchise.'].join(' ');
}

function uploadedScene(id, purpose, start, end, description, transitionIn, transitionOut, treatment, priority = 'required') {
  const duration = Math.max(0.5, end - start);
  return { id, sourceType: 'uploaded', purpose, duration: Number(duration.toFixed(2)), startTime: Number(start.toFixed(2)), endTime: Number(end.toFixed(2)), generationPrompt: '', continuityNotes: description || 'Use the real supplied footage.', transitionIn, transitionOut, priority, ...treatment };
}

function generatedScene(id, purpose, duration, prompt, transitionIn, transitionOut, priority = 'required') {
  return { id, sourceType: 'generated', purpose, duration: Number(duration.toFixed(2)), startTime: null, endTime: null, generationPrompt: prompt, continuityNotes: 'Generated locally by Bikeztagram compositor; preserve the supplied motorcycle as the visual identity anchor whenever compositing is possible.', transitionIn, transitionOut, priority };
}

function treatmentFor(index, count, style) {
  const treatments = [
    { motionStyle: 'slow-push', motionIntensity: 0.55, speed: 0.92, speedEnd: 1.0, colorGrade: style.dark ? 'dark-cinematic' : 'cinematic' },
    { motionStyle: 'pan-right', motionIntensity: 0.7, speed: 1.0, speedEnd: 1.08, colorGrade: style.neon ? 'vivid' : 'cinematic' },
    { motionStyle: style.action ? 'slow-push' : 'tilt-up', motionIntensity: 0.82, speed: style.action ? 1.08 : 1.02, speedEnd: style.action ? 1.18 : 1.08, colorGrade: style.dark ? 'moody-blue' : 'cinematic' },
    { motionStyle: 'pan-left', motionIntensity: 0.65, speed: 0.96, speedEnd: 1.0, colorGrade: style.dark ? 'dark-cinematic' : 'cinematic' },
    { motionStyle: style.action ? 'tilt-up' : 'tilt-down', motionIntensity: 0.72, speed: style.action ? 1.05 : 0.98, speedEnd: style.action ? 1.2 : 1.05, colorGrade: style.neon ? 'vivid' : 'cinematic' },
    { motionStyle: 'slow-pull', motionIntensity: 0.5, speed: 0.9, speedEnd: 0.82, colorGrade: style.dark ? 'dark-cinematic' : 'cinematic' }
  ];
  const base = treatments[index % treatments.length];
  return { ...base, transitionIn: index === 0 ? 'fade-in' : index % 2 ? 'crossfade' : 'hard-cut', transitionOut: index === count - 1 ? 'fade-out' : index % 2 ? 'action-blend' : 'cinematic-blend' };
}

function buildRealFootageScenes(analysis, targetDuration, style) {
  const sourceDuration = clamp(Number(analysis?.durationInSeconds) || 11, 3, 60);
  const target = Math.min(clamp(Number(targetDuration) || 15, 5, 60), sourceDuration);
  const moments = allBestMoments(analysis);
  const count = target >= 12 ? 6 : target >= 8 ? 5 : 3;
  const segment = target / count;
  const windowDuration = Math.min(2.6, Math.max(0.8, segment));
  const anchors = [];
  const minimumGap = Math.max(1.2, sourceDuration / (count * 1.5));
  for (const moment of moments) {
    const center = clamp((moment.start + moment.end) / 2, 0, sourceDuration);
    if (!anchors.some((a) => Math.abs(a.center - center) < minimumGap)) {
      anchors.push({ ...moment, center });
      if (anchors.length >= count) break;
    }
  }
  for (let index = 0; anchors.length < count && index < count * 3; index += 1) {
    const center = clamp((index + 0.5) * sourceDuration / (count * 1.5), 0, sourceDuration);
    if (!anchors.some((a) => Math.abs(a.center - center) < minimumGap)) {
      anchors.push({ start: Math.max(0, center - windowDuration / 2), end: Math.min(sourceDuration, center + windowDuration / 2), center, description: 'Use a distinct source segment to maintain visual variety in the cinematic story.', score: 0 });
    }
  }
  anchors.sort((a, b) => a.center - b.center);
  const scenes = [];
  anchors.slice(0, count).forEach((anchor, index) => {
    const desired = Math.min(windowDuration, Math.max(0.8, target / count));
    let start = clamp(anchor.center - desired / 2, 0, Math.max(0, sourceDuration - desired));
    let end = Math.min(sourceDuration, start + desired);
    const momentStart = clamp(anchor.start, 0, sourceDuration);
    const momentEnd = clamp(anchor.end, momentStart + 0.5, sourceDuration);
    if (momentEnd - momentStart >= desired * 0.75) {
      start = clamp(momentStart, 0, Math.max(0, sourceDuration - desired));
      end = Math.min(sourceDuration, start + desired);
    }
    const purpose = index === 0 ? 'real-opening' : index === count - 1 ? 'real-hero-ending' : (anchor.description || '').toLowerCase().match(/action|accelerat|corner|speed|riding|movement|chase/) ? 'real-action' : 'real-cinematic-beat';
    const treatment = treatmentFor(index, count, style);
    scenes.push(uploadedScene(`scene-${String(index + 1).padStart(2, '0')}`, purpose, start, end, anchor.description || 'Use a distinct verified Gemini moment from the supplied footage.', treatment.transitionIn, treatment.transitionOut, treatment));
  });
  if (scenes.length < count) {
    scenes.length = 0;
    for (let index = 0; index < count; index += 1) {
      const start = Math.min(sourceDuration - 0.5, index * segment);
      const end = Math.min(sourceDuration, start + segment);
      const treatment = treatmentFor(index, count, style);
      scenes.push(uploadedScene(`scene-${String(index + 1).padStart(2, '0')}`, index === 0 ? 'real-opening' : index === count - 1 ? 'real-hero-ending' : 'real-cinematic-beat', Math.max(0, start), Math.max(start + 0.5, end), 'Use this verified source segment as part of the real-footage cinematic story.', treatment.transitionIn, treatment.transitionOut, treatment));
    }
  }
  return { scenes, totalDuration: Number(scenes.reduce((sum, scene) => sum + scene.duration, 0).toFixed(2)), sourceDuration };
}

function buildGenerationPlan(analysis, creativeRequest, targetDuration) {
  const subject = text(analysis?.subject?.description) || text(analysis?.subject?.motorcycleModel) || 'the uploaded motorcycle';
  const world = detectWorld(creativeRequest);
  const style = detectStyle(creativeRequest);
  const generatedDuration = Math.min(3.2, Math.max(1.8, Number(targetDuration) * (style.action ? 0.22 : 0.16)));
  return [
    generatedScene('generated-world-establishing', 'generated-world-establishing', Math.min(2.2, Math.max(1.5, Number(targetDuration) * 0.14)), generatedPrompt({ creativeRequest, subject, world, style, purpose: 'Introduce the requested world and establish scale, atmosphere and direction of travel before the main action.' }), 'cinematic-blend', 'match-cut'),
    generatedScene('generated-action-fill', style.action ? 'generated-action-fill' : 'generated-environment-fill', generatedDuration, generatedPrompt({ creativeRequest, subject, world, style, purpose: style.action ? 'Fill the requested action beat with an original cinematic continuation that can bridge real motorcycle shots.' : 'Extend the requested environment around the real footage with an original cinematic transition.' }), 'action-blend', 'impact-cut'),
    generatedScene('generated-hero-ending', 'generated-hero-ending', Math.min(2.4, Math.max(1.5, Number(targetDuration) * 0.14)), generatedPrompt({ creativeRequest, subject, world, style, purpose: 'Finish with a memorable original hero reveal, keeping the motorcycle as the identity anchor and leaving clean space for an optional title.' }), 'hero-rise', 'fade-out')
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const { prompt = '', analysis = {}, targetDuration = 15 } = req.body || {};
    if (!analysis || typeof analysis !== 'object') return res.status(400).json({ success: false, error: 'Video analysis is required.' });
    const creativeRequest = text(prompt) || 'Create a cinematic social-media motorcycle video.';
    const requestedDuration = clamp(Number(targetDuration) || 15, 5, 60);
    const subject = text(analysis?.subject?.description) || text(analysis?.subject?.motorcycleModel) || 'the uploaded motorcycle';
    const style = detectStyle(creativeRequest);
    const real = buildRealFootageScenes(analysis, requestedDuration, style);
    const generationPlan = buildGenerationPlan(analysis, creativeRequest, requestedDuration);
    const continuity = subjectContinuity(analysis);
    const productionPlan = {
      version: '8.1',
      title: 'AI Director — Real Footage Master',
      creativeRequest,
      creativeDirection: `Turn the supplied ${subject} media into an original cinematic production driven by the user's request. Gemini supplies real-media understanding; Bikeztagram's current master render path executes verified real footage first.`,
      worldMode: detectWorld(creativeRequest),
      style,
      targetDuration: requestedDuration,
      plannedDuration: real.totalDuration,
      subjectContinuity: continuity,
      sourceAnalysis: { filename: text(analysis?.filename), durationSeconds: Number(analysis?.durationInSeconds || 0), strongestMoments: allBestMoments(analysis).slice(0, 8) },
      scenes: real.scenes,
      generationPlan,
      generationPolicy: { engine: 'bikeztagram-local-browser-compositor', paidVideoGeneration: false, externalVideoGenerator: false, useGeneratedFill: false, rule: 'Generated scenes are planned separately and are not substituted into the real-footage master render until the generation compositor is ready. Never imitate a named franchise, copyrighted character or soundtrack; translate the requested mood and cinematic traits into an original world.' },
      assemblyNotes: ['Use real uploaded footage as the identity anchor.', 'Use the strongest verified Gemini moments as separate cinematic cuts rather than repeating one source position.', 'Apply deterministic motion, speed and transition treatment per cut.', 'Use generated scenes only through the dedicated generation compositor when that renderer is ready.', 'Keep the current master render path local/browser-side so no paid video-generation API is required.']
    };
    return res.status(200).json({ success: true, productionPlan });
  } catch (error) {
    console.error('[PRODUCTION-PLAN] ERROR', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to build production blueprint.' });
  }
}
