/* BIKEZTAGRAM AI — deterministic revision intent, no rendering side effects. */

const RULES = [
  [/\b(darker|darken)\b/i, { field: 'treatment.lighting', value: 'darker' }],
  [/\b(brighter|brighten)\b/i, { field: 'treatment.lighting', value: 'brighter' }],
  [/\b(faster|more dynamic)\b/i, { field: 'editPlan.pacing', value: 'faster' }],
  [/\b(slower|more relaxed)\b/i, { field: 'editPlan.pacing', value: 'slower' }],
  [/\b(more cinematic)\b/i, { field: 'treatment.style', value: 'cinematic' }],
  [/\b(more aggressive)\b/i, { field: 'treatment.intensity', value: 'aggressive' }],
  [/\b(vertical|9:16)\b/i, { field: 'intent.platform', value: 'reels' }],
  [/\b(landscape|16:9)\b/i, { field: 'intent.platform', value: 'youtube' }],
];

export function parseCreativeRevision(command = '') {
  const changes = RULES.flatMap(([pattern, change]) => pattern.test(String(command)) ? [change] : []);
  return { version: 1, command: String(command).trim(), changes, requiresReplan: changes.length > 0 };
}

export function applyCreativeRevision(project, revision) {
  if (!project || !revision) return project;
  const next = structuredClone(project);
  revision.changes.forEach(({ field, value }) => {
    const parts = field.split('.');
    let target = next;
    parts.slice(0, -1).forEach((part) => { target[part] ||= {}; target = target[part]; });
    target[parts.at(-1)] = value;
  });
  return next;
}
