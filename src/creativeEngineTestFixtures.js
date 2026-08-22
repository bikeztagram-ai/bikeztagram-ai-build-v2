// Deterministic fixtures for Creative Engine local contract verification.
// No network, secrets, Blob, Gemini or Vercel dependencies.

export function createCreativeFixture(overrides = {}) {
  const job = {
    id: 'fixture-job-001',
    request: 'Create a 15 second cinematic motorcycle reel',
    assets: [
      { id: 'bike-video', name: 'bike.mp4', type: 'video/mp4', sourceUrl: 'fixture://bike.mp4' },
      { id: 'hero-photo', name: 'hero.jpg', type: 'image/jpeg', sourceUrl: 'fixture://hero.jpg' },
    ],
    ...overrides.job,
  };

  const plan = {
    duration: 15,
    cuts: [
      { mediaIndex: 0, duration: 2.5, purpose: 'hook' },
      { mediaIndex: 1, duration: 2.5, purpose: 'reveal' },
    ],
    ...overrides.plan,
  };

  return {
    job,
    plan,
    render: overrides.render || { playable: true, format: 'video/mp4', duration: 15 },
    qa: overrides.qa || { score: 0.95 },
    exportInfo: overrides.exportInfo || { format: 'mp4', ready: true },
  };
}
