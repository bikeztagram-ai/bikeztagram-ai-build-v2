/* BIKEZTAGRAM AI — high-level creative blueprint. */

export function buildContentBlueprint({ subjectType = 'general', goal = 'engage', audience = 'general', platform = 'social', mood = 'cinematic', duration = 30 } = {}) {
  return {
    version: 1,
    subjectType,
    goal,
    audience,
    platform,
    mood,
    duration: Math.max(3, Number(duration) || 30),
    beats: [
      { id: 'hook', purpose: 'hook', weight: 0.18 },
      { id: 'setup', purpose: 'context', weight: 0.22 },
      { id: 'escalation', purpose: 'build', weight: 0.30 },
      { id: 'payoff', purpose: 'payoff', weight: 0.22 },
      { id: 'end', purpose: 'brand-or-memory', weight: 0.08 },
    ],
  };
}
