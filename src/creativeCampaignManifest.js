/* BIKEZTAGRAM AI — durable campaign model for one source project producing many deliverables. */

export function createCampaign({ projectId = null, name = 'Untitled Campaign', dna = null } = {}) {
  return { version: 1, id: null, projectId, name, dna, deliverables: [], status: 'planning' };
}

export function addDeliverable(campaign, deliverable) {
  return { ...campaign, deliverables: [...campaign.deliverables, { id: deliverable.id || `deliverable-${campaign.deliverables.length + 1}`, platform: deliverable.platform || 'reels', format: deliverable.format || 'vertical-short', status: 'planned', sourceProjectId: campaign.projectId }] };
}
