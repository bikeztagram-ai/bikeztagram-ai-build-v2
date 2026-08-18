/* BIKEZTAGRAM AI — client boundary for the verified two-stage director. */
import { buildMultiPlatformPlan } from './platformReframe.js';
import { buildReframeReadiness } from './platformReframeQuality.js';
import { shapeCinematicEditPlan } from './editDirectorPolicy.js';
import { assessRenderExecution } from './renderExecutionPolicy.js';

function text(value) { return String(value ?? '').trim(); }
function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export async function requestTwoStageEditPlan({ prompt, analysis, targetDuration = 15, signal } = {}) {
  if (!analysis || typeof analysis !== 'object') throw new Error('Verified Stage 1 analysis is required before Stage 2.');
  const response = await fetch('/api/edit-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ prompt: text(prompt), analysis, targetDuration: clamp(number(targetDuration, 15), 5, 60) }),
  });
  const responseText = await response.text();
  let data;
  try { data = JSON.parse(responseText); } catch { throw new Error(`Stage 2 returned invalid JSON: ${responseText.slice(0, 500)}`); }
  if (!response.ok) throw new Error(data?.error || `Stage 2 returned HTTP ${response.status}`);
  if (!data?.plan?.cuts?.length) throw new Error('Stage 2 returned no verified edit cuts.');
  return data.plan;
}

export function editPlanToDirectorBlueprint(plan, analysis, prompt, targetDuration = 15, platforms = ['reels', 'tiktok', 'shorts']) {
  const shapedPlan = shapeCinematicEditPlan(plan, Array.isArray(analysis?.bestMoments) ? analysis.bestMoments : []);
  const cuts = Array.isArray(shapedPlan?.cuts) ? shapedPlan.cuts : [];
  const scenes = cuts.map((cut, index) => ({
    id: `scene-${String(index + 1).padStart(2, '0')}`,
    sourceType: 'uploaded',
    purpose: text(cut.purpose) || 'cinematic-beat',
    duration: clamp(number(cut.duration, 1.5), 0.5, 4),
    startTime: number(cut.startTime, 0),
    endTime: number(cut.endTime, number(cut.startTime, 0) + number(cut.duration, 1.5)),
    generationPrompt: '',
    continuityNotes: 'Verified real-footage source. Preserve the supplied motorcycle and environment.',
    transitionIn: text(cut.transition) || 'hard-cut',
    transitionOut: 'hard-cut',
    motionStyle: text(cut.motionStyle) || 'static',
    motionIntensity: clamp(number(cut.motionIntensity, 0.9), 0, 1.5),
    speed: clamp(number(cut.speed, 1), 0.5, 1.5),
    speedEnd: clamp(number(cut.speedEnd, number(cut.speed, 1)), 0.5, 1.5),
    priority: index === cuts.length - 1 ? 'hero' : 'required',
    text: text(cut.text),
  }));
  const plannedDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const platformPlan = buildMultiPlatformPlan(analysis, platforms);
  const reframeReadiness = buildReframeReadiness(platformPlan, analysis);
  const executionPlan = assessRenderExecution({
    cuts: scenes.map((scene) => ({
      startTime: scene.startTime,
      endTime: scene.endTime,
      duration: scene.duration,
      speed: scene.speed,
      speedEnd: scene.speedEnd,
    })),
  }, clamp(number(targetDuration, 15), 5, 60), {
    sourceDuration: number(analysis?.durationInSeconds ?? analysis?.durationSeconds, 0),
  });
  return {
    version: 'two-stage-edit-plan-adapter',
    title: text(shapedPlan.title) || 'Bikeztagram AI Cinematic Edit',
    creativeRequest: text(prompt),
    creativeDirection: 'Stage 1 analysed the actual uploaded video; Stage 2 selected and directed verified moments only.',
    targetDuration: clamp(number(targetDuration, 15), 5, 60),
    plannedDuration: Number(plannedDuration.toFixed(2)),
    executionReadiness: executionPlan,
    worldMode: 'real-footage-cinematic',
    style: { cinematic: true, dark: text(shapedPlan.colorGrade).includes('dark') },
    sourceAnalysis: {
      filename: text(analysis?.filename),
      durationSeconds: number(analysis?.durationInSeconds ?? analysis?.durationSeconds, 0),
      strongestMoments: Array.isArray(analysis?.bestMoments) ? analysis.bestMoments.slice(0, 8) : [],
    },
    scenes,
    platformPlan,
    reframeReadiness,
    directorNotes: [
      ...(Array.isArray(shapedPlan.editorialStructure) ? [`Editorial structure: ${shapedPlan.editorialStructure.join(' → ')}`] : []),
      'All scenes are sourced from verified Stage 1 moments.',
      'No generated footage is requested by this execution path.',
      'Platform reframing preserves the same verified edit and source timestamps.',
      `Render execution readiness: ${executionPlan.ready ? 'ready' : 'blocked until plan is repaired'}.`,
    ],
    directorSource: 'gemini-two-stage-edit-plan',
    mode: 'real-footage-first',
    generationPolicy: {
      paidVideoGeneration: false,
      externalVideoGenerator: false,
      generatedScenesAllowed: false,
      rule: 'This execution path uses only the supplied real footage.',
    },
  };
}
