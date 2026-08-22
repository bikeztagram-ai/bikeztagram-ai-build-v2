// Bikeztagram AI — Creative Engine acceptance gate.
// Pure local contract: no network, no Vercel, no provider calls.

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

export function scoreCreativeOutput({ plan = {}, render = {}, qa = {}, exportInfo = null } = {}) {
  const checks = {
    hasCuts: Array.isArray(plan.cuts) && plan.cuts.length > 0,
    hasRender: Boolean(render),
    renderPlayable: render?.playable !== false,
    hasQa: Boolean(qa),
    qaThreshold: number(qa?.score) == null || Number(qa.score) >= 0.7,
    hasExport: exportInfo == null || Boolean(exportInfo),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  return { checks, score: passed / total, accepted: passed === total };
}

export function buildAcceptanceReport({ job, plan, render, qa, exportInfo } = {}) {
  const result = scoreCreativeOutput({ plan, render, qa, exportInfo });
  return {
    version: 1,
    jobId: job?.id || null,
    accepted: result.accepted,
    score: result.score,
    checks: result.checks,
    blockers: Object.entries(result.checks).filter(([, ok]) => !ok).map(([name]) => name),
    nextAction: result.accepted ? 'export' : 'revise',
  };
}
