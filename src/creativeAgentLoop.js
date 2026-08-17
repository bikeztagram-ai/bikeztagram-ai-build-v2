/* BIKEZTAGRAM AI — bounded agent loop: plan, evaluate, revise. */

export function createCreativeAgentState(input = {}) {
  return { version: 1, goal: input.goal || 'create-best-content', status: 'planning', iteration: 0, maxIterations: Math.max(1, Math.min(10, Number(input.maxIterations) || 4)), plan: input.plan || null, feedback: [], decisions: [] };
}

export function scoreCreativePlan(plan = {}, criteria = {}) {
  const checks = [Boolean(plan.story || plan.beats), Boolean(plan.visualLook || plan.treatment), Boolean(plan.tracks || plan.shots), criteria.hasAssets !== false, criteria.platformReady !== false];
  const score = checks.filter(Boolean).length / checks.length;
  return { score, ready: score >= 0.8, missing: checks.map((ok, i) => ok ? null : i).filter((v) => v !== null) };
}

export function nextCreativeAgentStep(state, evaluation = {}) {
  if (state.iteration >= state.maxIterations || evaluation.ready) return { ...state, status: evaluation.ready ? 'ready' : 'needs-review' };
  return { ...state, iteration: state.iteration + 1, status: 'revising', feedback: [...state.feedback, evaluation], decisions: [...state.decisions, { iteration: state.iteration + 1, action: 'revise-plan' }] };
}
