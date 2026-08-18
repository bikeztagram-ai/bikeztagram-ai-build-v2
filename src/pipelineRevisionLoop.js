import { classifyRevision } from './creativeRevisionImpact.js';

export function planRevisionLoop(project = {}, feedback = '') {
  const revision = classifyRevision(feedback);
  const downstream = new Set(revision.stages || []);
  const stages = ['story','treatment','look','generation','reframe','edit','music','sound','captions','export','quality'];
  return { feedback: String(feedback), revision, stages: stages.map((id) => ({ id, affected: downstream.has(id), status: downstream.has(id) ? 'replan' : 'preserve' })) };
}
