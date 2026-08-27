import { compileCreativeBrief } from '../src/creative/creativeBriefCompiler.js';
import { planCreativeStory, validateCreativeStoryPlan } from '../src/creative/creativeStoryPlanner.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const brief = compileCreativeBrief({
  request: 'Make a dark cinematic motorcycle reveal that builds tension, then accelerates into an energetic hero ending.',
  output: 'SOCIAL_REEL',
  mood: 'DARK',
  durationSeconds: 15,
  aspectRatio: '9:16',
  constraints: ['Keep the motorcycle identity consistent.'],
  references: [{ id: 'bike', role: 'SUBJECT', description: 'primary motorcycle', preserve: ['IDENTITY', 'OBJECT_DETAILS'] }],
});

const plan = planCreativeStory({
  brief,
  primarySubject: 'vehicle',
  media: [
    { id: 'hook', type: 'video/mp4', score: 92, duration: 2, subjectType: 'vehicle', name: 'dark road mystery' },
    { id: 'detail', type: 'image/jpeg', score: 80, duration: 1, subjectType: 'vehicle', name: 'detail close-up' },
    { id: 'reveal', type: 'video/mp4', score: 95, duration: 3, subjectType: 'vehicle', name: 'hero reveal showcase' },
    { id: 'action', type: 'video/mp4', score: 96, duration: 4, subjectType: 'vehicle', name: 'riding acceleration action' },
    { id: 'hero', type: 'image/jpeg', score: 99, duration: 2, subjectType: 'vehicle', name: 'sunset hero' },
  ],
});

const validation = validateCreativeStoryPlan(plan);
assert(validation.valid, validation.errors.join('; '));
assert(plan.moments.length === 5, 'expected five narrative moments');
assert(plan.moments[0].phase === 'hook', 'expected hook first');
assert(plan.moments[2].phase === 'reveal', 'expected reveal in the middle');
assert(plan.moments[4].phase === 'hero', 'expected hero ending');
assert(plan.moments.every((moment) => moment.durationSeconds > 0), 'all moments need positive durations');
assert(plan.summary.selectedSourceCount >= 3, 'planner should select useful source media');
assert(plan.guardrails.some((item) => item.includes('original')), 'copyright guardrail missing');

const emptyPlan = planCreativeStory({ brief, primarySubject: 'unknown', media: [] });
assert(emptyPlan.strategy.includes('generation-first'), 'empty media should switch strategy');
assert(emptyPlan.moments.some((moment) => moment.generation.allowed), 'generation should be available without source media');

console.log('Creative story planner verification passed.');
