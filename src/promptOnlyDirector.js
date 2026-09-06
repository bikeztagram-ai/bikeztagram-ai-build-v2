/* Prompt-only director: converts an arbitrary creative idea into a generation-ready film plan. No source media required. */
import { buildCreativeSceneGraph, interpretCreativeBrief } from './universalCreativeEngine.js';
import { compileCreativeIntent } from './creativeIntentCompiler.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const text = (v) => String(v ?? '').trim();

function roleLabel(role) {
  return String(role || '').replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export function createPromptOnlyEditPlan(prompt = '', options = {}) {
  const creativePrompt = text(prompt);
  if (creativePrompt.length < 3) throw new Error('Describe the creative idea before generating a film.');
  const duration = clamp(Number(options.targetDuration) || interpretCreativeBrief(creativePrompt, options).duration || 15, 3, 120);
  const graph = buildCreativeSceneGraph(creativePrompt, { ...options, duration });
  const intent = compileCreativeIntent(creativePrompt, { ...options, duration });
  const shots = graph.shots || [];
  if (!shots.length || !intent.shots?.length) throw new Error('The creative director could not produce a usable scene graph.');

  const cuts = shots.map((shot, index) => {
    const directed = intent.shots[index % intent.shots.length];
    const shotDuration = Number(shot.duration || directed.duration || duration / shots.length);
    return {
      id: shot.id,
      sourceIndex: index,
      mediaIndex: index,
      mediaId: undefined,
      sourceType: 'generated',
      generated: true,
      generationPrompt: directed.generationPrompt,
      creativeIntent: directed,
      purpose: roleLabel(shot.role),
      role: shot.role,
      duration: Number(shotDuration.toFixed(3)),
      transition: directed.transition || shot.transition,
      motionStyle: directed.camera?.movement || shot.camera,
      motionIntensity: Number(directed.camera?.intensity || shot.motionIntensity || 0.8),
      speed: 1,
      colorGrade: directed.lighting?.length ? `${directed.mood || 'cinematic'} cinematic` : 'cinematic',
      stabilization: true,
      text: '',
      world: directed.world,
      subject: directed.subject,
      action: directed.action,
      lighting: directed.lighting,
      atmosphere: directed.atmosphere,
      weather: directed.weather,
      time: directed.time,
      beatTargets: directed.beatTargets,
    };
  });

  const total = cuts.reduce((sum, cut) => sum + Number(cut.duration || 0), 0) || 1;
  const scale = duration / total;
  const normalizedCuts = cuts.map((cut, index) => ({
    ...cut,
    duration: Number((Number(cut.duration) * scale).toFixed(3)),
    transition: index === 0 ? 'fade-in' : index === cuts.length - 1 ? 'fade-out' : cut.transition,
  }));

  return {
    title: `${intent.brief?.subject || 'Creative'} — AI Film`,
    style: intent.brief?.style || graph.brief?.mood || 'cinematic',
    creativePrompt,
    subject: intent.brief?.subject || graph.brief?.subject || 'original subject',
    world: intent.brief?.world || graph.brief?.world || 'original world',
    colorGrade: intent.brief?.mood || 'cinematic',
    outputPreset: options.outputPreset || 'portrait',
    targetDuration: duration,
    duration,
    cuts: normalizedCuts,
    generatedOnly: true,
    source: 'bikeztagram-prompt-only-director',
    creativeIntent: intent,
    sceneGraph: graph,
    generation: {
      mode: 'text-to-video',
      provider: 'Runway Gen-4.5',
      shots: normalizedCuts.length,
      realGeneratedMediaRequired: true,
    },
  };
}
