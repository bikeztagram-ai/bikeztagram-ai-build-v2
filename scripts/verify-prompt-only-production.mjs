import { createPromptOnlyEditPlan } from '../src/promptOnlyDirector.js';

const cases = [
  'Create an original sci-fi chase through a flooded megacity at midnight, starting quiet and escalating into a huge escape.',
  'Make a whimsical stop-motion story about a tiny robot discovering a hidden garden at sunrise.',
  'Create a premium product film for an imaginary watch floating through a surreal desert, with macro detail and elegant camera movement.',
  'Make a tense horror short about an explorer finding an abandoned observatory during a storm.'
];

for (const prompt of cases) {
  const plan = createPromptOnlyEditPlan(prompt, { targetDuration: 15, outputPreset: 'portrait' });
  if (!plan.generatedOnly) throw new Error('Prompt-only plan is not marked generatedOnly.');
  if (plan.generation?.mode !== 'text-to-video') throw new Error('Prompt-only plan is not text-to-video.');
  if (plan.generation?.provider !== 'Runway Gen-4.5') throw new Error('Prompt-only plan provider mismatch.');
  if (!Array.isArray(plan.cuts) || plan.cuts.length < 3) throw new Error('Prompt-only plan needs at least three shots.');
  if (plan.cuts.some((cut) => !cut.generated || !cut.generationPrompt)) throw new Error('Every prompt-only shot needs real generation metadata.');
  if (plan.cuts.some((cut) => cut.mediaId || cut.sourceType !== 'generated')) throw new Error('Prompt-only shots must not pretend to reference uploaded media.');
  if (plan.cuts.some((cut) => /gemini/i.test(JSON.stringify(cut)))) throw new Error('Gemini reference detected.');
}

console.log('Prompt-only production: PASS');
