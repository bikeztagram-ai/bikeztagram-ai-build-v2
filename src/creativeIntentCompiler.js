/* BIKEZTAGRAM AI — compositional creative intent compiler. */
import { interpretCreativeBrief, buildCreativeSceneGraph } from './universalCreativeEngine.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const text = (v) => String(v ?? '').trim();
const LIGHTING = { night: ['neon', 'moonlight', 'practical-lights'], sunset: ['golden-hour', 'rim-light', 'long-shadows'], dawn: ['soft-dawn', 'cool-fill', 'warm-rim'], day: ['natural-key', 'directional-sun', 'soft-fill'] };
const ACTION_HINTS = [
  ['chase', 'pursue', 'overtake'], ['race', 'accelerate', 'drift'], ['reveal', 'discover', 'emerge'],
  ['explode', 'impact', 'crash'], ['fly', 'soar', 'dive'], ['walk', 'approach', 'enter'], ['fight', 'attack', 'escape'],
];
function inferActions(prompt, brief, shot) {
  const p = text(prompt).toLowerCase();
  const actions = ACTION_HINTS.filter((words) => words.some((w) => p.includes(w))).flat();
  if (actions.length) return actions.slice(0, 4);
  if (brief.pace === 'fast') return ['accelerate', 'track', 'cut'];
  if (shot.role.includes('reveal')) return ['hold', 'reveal', 'resolve'];
  return ['establish', 'move', 'hold'];
}
function lightingFor(brief) { return [...(LIGHTING[brief.time] || LIGHTING.day), brief.mood === 'dark' ? 'negative-fill' : 'ambient-fill']; }

export function compileCreativeIntent(prompt = '', options = {}) {
  const brief = interpretCreativeBrief(prompt, options);
  const graph = buildCreativeSceneGraph(prompt, options);
  const continuity = { subjectIdentity: brief.subject, worldIdentity: brief.world, palette: graph.palette, weather: brief.weather, time: brief.time, preserveAcrossShots: ['subject', 'world', 'lighting-direction', 'color-language'] };
  const shots = graph.shots.map((shot, index) => {
    const action = inferActions(prompt, brief, shot);
    const lighting = lightingFor(brief);
    return {
      id: shot.id, index, role: shot.role, duration: shot.duration, subject: shot.subject, world: shot.world,
      camera: { movement: shot.camera, intensity: shot.motionIntensity }, action, lighting, atmosphere: shot.effects,
      weather: shot.weather, time: shot.time, mood: shot.mood, transition: shot.transition, depthLayers: shot.depthLayers,
      beatTargets: shot.beats.map((beat) => ({ ...beat, energy: clamp(beat.energy * brief.intensity, 0.05, 1) })),
      generationPrompt: [`Subject: ${shot.subject}`, `World: ${shot.world}`, `Shot role: ${shot.role}`, `Camera: ${shot.camera}`,
        `Action: ${action.join(', ')}`, `Lighting: ${lighting.join(', ')}`, `Atmosphere: ${shot.effects.join(', ') || 'clean cinematic air'}`,
        `Mood: ${shot.mood}`, `Continuity: preserve ${continuity.subjectIdentity} and ${continuity.worldIdentity} across shots`,
        `Original creative brief: ${text(prompt)}`].join('. '),
    };
  });
  return { version: 2, type: 'creative-intent-graph', brief, continuity, shots, duration: graph.totalDuration, output: graph.render, providers: graph.providers, policy: graph.copyright };
}

export function mergeCreativeIntent(plan = {}, intent = {}) {
  const intentShots = Array.isArray(intent.shots) ? intent.shots : [];
  const existing = Array.isArray(plan.cuts) ? plan.cuts : Array.isArray(plan.clips) ? plan.clips : [];
  const cuts = existing.map((cut, index) => {
    const shot = intentShots[index % Math.max(intentShots.length, 1)];
    if (!shot) return cut;
    return { ...cut, creativeIntent: shot, transition: shot.transition || cut.transition, motionStyle: shot.camera?.movement || cut.motionStyle, action: shot.action, generationPrompt: shot.generationPrompt };
  });
  return { ...plan, creativeIntent: intent, cuts: cuts.length ? cuts : intentShots.map((shot) => ({ id: shot.id, duration: shot.duration, transition: shot.transition, motionStyle: shot.camera.movement, creativeIntent: shot, generationPrompt: shot.generationPrompt })) };
}

export function intentToProviderPrompt(intent, shotIndex = 0) {
  const shot = intent?.shots?.[shotIndex];
  if (!shot) throw new Error(`Unknown creative shot: ${shotIndex}`);
  return `${shot.generationPrompt}. Cinematic commercial-quality motion, believable physics, coherent temporal movement, consistent subject identity, no text, no watermark.`;
}
