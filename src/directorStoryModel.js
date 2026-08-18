/* BIKEZTAGRAM AI — director story coherence contract.
   Pure planning logic. It does not alter Blob, Gemini, or rendering configuration. */

const ACTION_WORDS = /action|accelerat|corner|speed|riding|movement|chase|race|pursuit|overtak/i;

export function scoreStoryCoherence(scenes = []) {
  if (!Array.isArray(scenes) || scenes.length < 3) return { score: 0, issues: ['At least three scenes are required.'] };
  const issues = [];
  const first = scenes[0]?.purpose || '';
  const last = scenes[scenes.length - 1]?.purpose || '';
  if (!String(first).includes('opening')) issues.push('Opening scene is not marked as the hook.');
  if (!String(last).includes('hero-ending')) issues.push('Final scene is not marked as the hero ending.');

  let actionCount = 0;
  let distinctSources = 0;
  let previousStart = -Infinity;
  const starts = new Set();
  for (const scene of scenes) {
    if (ACTION_WORDS.test(`${scene?.purpose || ''} ${scene?.continuityNotes || ''}`)) actionCount += 1;
    const start = Number(scene?.startTime);
    if (Number.isFinite(start) && start > previousStart) distinctSources += 1;
    if (Number.isFinite(start)) starts.add(start.toFixed(2));
    previousStart = Number.isFinite(start) ? start : previousStart;
  }
  if (actionCount === 0) issues.push('No action/escalation beat detected.');
  if (starts.size < Math.min(3, scenes.length)) issues.push('Insufficient source-time variety.');

  const score = Math.max(0, Math.round(100 - issues.length * 20));
  return { score, issues, actionCount, distinctSources: starts.size };
}

export function assignStoryRoles(scenes = []) {
  const count = scenes.length;
  return scenes.map((scene, index) => {
    const text = `${scene?.purpose || ''} ${scene?.continuityNotes || ''}`;
    const role = index === 0 ? 'hook' : index === count - 1 ? 'hero' : ACTION_WORDS.test(text) ? 'escalation' : index < count / 2 ? 'build' : 'release';
    return { ...scene, storyRole: role, storyOrder: index + 1 };
  });
}

export function buildStoryDirection(scenes = [], { beatMap = null } = {}) {
  const assigned = assignStoryRoles(scenes);
  return {
    roles: assigned.map((scene) => ({ id: scene.id, role: scene.storyRole, order: scene.storyOrder })),
    coherence: scoreStoryCoherence(assigned),
    beatAware: Boolean(beatMap?.beats?.length),
    direction: 'Build anticipation from the hook, increase visual energy through the middle, place action on strong musical moments where available, then release into a deliberate hero ending.'
  };
}
