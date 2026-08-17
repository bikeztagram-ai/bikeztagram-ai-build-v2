/* BIKEZTAGRAM AI — look planning, separate from Blob/storage configuration. */

import { getVisualLook, normaliseLookAdjustments } from './visualLookEngine.js';

export function buildVisualLookPlan({ lookId, adjustments = {}, consistency = 'locked', notes = '' } = {}) {
  const look = getVisualLook(lookId);
  if (!look) throw new Error('Unknown visual look.');
  return {
    version: 1,
    lookId: look.id,
    name: look.name,
    adjustments: normaliseLookAdjustments({ ...look.grade, ...adjustments }),
    consistency: consistency === 'adaptive' ? 'adaptive' : 'locked',
    notes: String(notes).trim(),
  };
}

export function applyLookToShot(shot = {}, lookPlan) {
  if (!lookPlan?.lookId) throw new Error('A valid visual look plan is required.');
  return {
    ...shot,
    visualLook: {
      id: lookPlan.lookId,
      adjustments: { ...lookPlan.adjustments },
      consistency: lookPlan.consistency,
    },
  };
}

export function validateLookContinuity(shots = []) {
  const ids = shots.map((shot) => shot?.visualLook?.id).filter(Boolean);
  if (ids.length < 2) return { valid: true, consistent: true, mismatches: [] };
  const first = ids[0];
  const mismatches = ids.map((id, index) => id !== first ? index + 1 : null).filter(Boolean);
  return { valid: true, consistent: mismatches.length === 0, mismatches };
}
