import { createAIEditPlan } from '../src/aiEditPlanner.js';

const bestMoments = [
  { mediaIndex: 0, description: 'tight Ninja badge close-up detail', shotType: 'close-up', start: 0, end: 2 },
  { mediaIndex: 1, description: 'Ninja badge close-up detail', shotType: 'macro', start: 0, end: 2 },
  { mediaIndex: 2, description: 'Ninja badge close-up detail', shotType: 'close-up', start: 0, end: 2 },
  { mediaIndex: 3, description: 'Ninja badge close-up detail', shotType: 'macro', start: 0, end: 2 },
  { mediaIndex: 4, description: 'Ninja badge close-up detail', shotType: 'close-up', start: 0, end: 2 },
  { mediaIndex: 5, description: 'wide establishing shot of motorcycle and road', shotType: 'wide', start: 0, end: 3 },
  { mediaIndex: 6, description: 'motorcycle accelerating through a sweeping road corner', shotType: 'action', start: 0, end: 3 },
  { mediaIndex: 7, description: 'hero motorcycle reveal at sunset', shotType: 'wide', editorialRole: 'hero-ending', start: 0, end: 3 },
];

const directedCuts = bestMoments.map((_, momentIndex) => ({ momentIndex, duration: 2 }));
const plan = createAIEditPlan({
  durationInSeconds: 15,
  subject: { label: 'motorcycle' },
  bestMoments,
  aiEditPlan: { cuts: directedCuts },
}, { targetDuration: 12, maxCuts: 6, creativePrompt: 'cinematic motorcycle reveal' });

if (!plan?.cuts?.length) throw new Error('No cuts produced');
const selected = new Set(plan.cuts.map(c => Number(c.mediaIndex)));
if (!selected.has(5) || !selected.has(6) || !selected.has(7)) throw new Error(`Editorial coverage lost: ${[5,6,7].filter(i => !selected.has(i)).join(',')}`);
const details = plan.cuts.filter(c => /detail|close-up|macro/.test(String(c.purpose).toLowerCase())).length;
if (details > 2) throw new Error(`Detail-shot overload remains: ${details}`);
if (plan.cuts.some((cut, i) => i > 0 && Number(cut.mediaIndex) === Number(plan.cuts[i - 1].mediaIndex))) throw new Error('Adjacent duplicate source survived director handoff');
console.log('AI edit director handoff: PASS');
