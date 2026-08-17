/* BIKEZTAGRAM AI — cinematic prompt normalization. £0-only. */
export function normalizeCinematicPrompt(prompt, { continuity = null, style = 'cinematic', environment = null } = {}) {
  const base = String(prompt || '').trim();
  if (!base) throw new Error('A cinematic brief is required.');
  const parts = [base, style ? `Visual style: ${style}.` : '', environment ? `Environment: ${environment}.` : '', continuity ? `Continuity constraints: ${continuity}.` : ''].filter(Boolean);
  return parts.join(' ');
}
