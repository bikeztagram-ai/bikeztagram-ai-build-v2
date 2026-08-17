/* BIKEZTAGRAM AI — avoid regenerating unaffected work after feedback. */

const IMPACT = Object.freeze({ darker: ['look','colour'], brighter: ['look','colour'], faster: ['edit','music'], slower: ['edit','music'], cinematic: ['treatment','look','edit'], captions: ['captions'], vertical: ['reframe','export'], landscape: ['reframe','export'], music: ['music','edit'], sound: ['sound'], story: ['story','edit','generation'] });

export function classifyRevision(text = '') {
  const value = String(text).toLowerCase();
  const keys = Object.keys(IMPACT).filter((key) => value.includes(key));
  const stages = [...new Set(keys.flatMap((key) => IMPACT[key]))];
  return { requested: String(text), keys, stages: stages.length ? stages : ['review'] };
}

export function buildRegenerationScope(revision, project = {}) {
  const classification = typeof revision === 'string' ? classifyRevision(revision) : revision;
  const stages = classification.stages || [];
  return { ...classification, regenerate: stages.includes('generation') ? (project.shots || project.editPlan?.tracks?.video || []) : [], preserve: ['assets','storage','unaffected-shots'].filter((item) => !stages.includes(item)) };
}
