/* BIKEZTAGRAM AI — adapter boundary between planning and existing renderer. */
import { createTimeline, validateTimeline } from './timelineModel.js';
import { createTimelineFromVerifiedCuts } from './verifiedCutTimeline.js';

function timelineFromEditPlan(editPlan) {
  if (!editPlan) return null;
  if (Array.isArray(editPlan.cuts)) return createTimelineFromVerifiedCuts(editPlan.cuts);
  return createTimeline(editPlan);
}

export function buildRenderJob(project = {}, execution = {}) {
  const output = project.outputs?.primary || project.output || {};
  const timeline = timelineFromEditPlan(project.editPlan);
  return {
    version: 2,
    projectId: project.id || null,
    execution,
    render: {
      width: Number(output.width) || 1080,
      height: Number(output.height) || 1920,
      fps: Number(output.fps) || 30,
      duration: Number(project.intent?.duration) || timeline?.duration || 30,
    },
    timeline,
    look: project.visualLook || project.treatment?.look || null,
    audio: project.audioPlan || null,
    captions: project.captions || null,
  };
}

export function validateRenderJob(job = {}) {
  const errors = [];
  if (!job.timeline) errors.push('Render job has no timeline.');
  if (job.timeline) {
    const timelineValidation = validateTimeline(job.timeline);
    if (!timelineValidation.valid) errors.push(...timelineValidation.errors);
  }
  if (!job.render?.width || !job.render?.height) errors.push('Render dimensions are missing.');
  if (!job.render?.fps) errors.push('Render frame rate is missing.');
  return { valid: errors.length === 0, errors };
}
