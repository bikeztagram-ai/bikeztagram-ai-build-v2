/* BIKEZTAGRAM AI — large-batch production conductor.
   Coordinates the universal filmmaker pipeline without requiring Gemini. */
import { buildNoGeminiCreativePlan, createNoGeminiCreativeRuntime } from './creativeEngineNoGemini.js';
import { planAudioDirector } from './audioDirector.js';
import { buildAudioMixPlan } from './audioMixPlan.js';
import { buildAudioTimeline } from './audioTimeline.js';
import { planEditorialRhythm } from './editorialRhythm.js';
import { selectDirectorMoments } from './directorSelection.js';

export function buildUniversalProduction(input = {}) {
  const prompt = input.creativePrompt || input.prompt || '';
  const duration = Number(input.targetDuration || 15);
  const selected = selectDirectorMoments(input.moments || [], { maxCuts: input.maxCuts || 8, targetDuration: duration, creativePrompt: prompt });
  const rhythm = planEditorialRhythm(selected, { targetDuration: duration, creativePrompt: prompt });
  const audioDirection = planAudioDirector({ creativePrompt: prompt, duration, cuts: rhythm });
  const mixPlan = buildAudioMixPlan({ audioDirection, hasVoiceover: Boolean(input.hasVoiceover), hasSfx: input.hasSfx !== false });
  const audioTimeline = buildAudioTimeline({ audioDirection, cuts: rhythm, mixPlan });
  const creativePlan = buildNoGeminiCreativePlan({ ...input, prompt, duration, moments: selected });
  return {
    version: 'universal-production-v1',
    creativePlan,
    selectedMoments: selected,
    rhythm,
    audioDirection,
    mixPlan,
    audioTimeline,
    stages: ['understand', 'direct', 'edit', 'compose', 'sync', 'generate', 'render', 'qa', 'revise', 'export'],
  };
}

export function createUniversalProductionRuntime(input = {}, adapters = {}) {
  const production = buildUniversalProduction(input);
  const { runtime } = createNoGeminiCreativeRuntime({ ...input, production }, adapters);
  return { production, runtime };
}
