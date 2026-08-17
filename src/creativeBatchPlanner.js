/* BIKEZTAGRAM AI — turn one project into a coherent content package. */

const FORMATS = Object.freeze(['hero','teaser-15s','trailer-30s','vertical-short','square-cut','thumbnail-stills']);

export function buildContentCampaign({ projectId = null, subjectType = 'general', platforms = ['reels','youtube'], formats = FORMATS } = {}) {
  const selectedPlatforms = Array.isArray(platforms) && platforms.length ? platforms : ['reels'];
  const selectedFormats = Array.isArray(formats) && formats.length ? formats : FORMATS;
  return {
    version: 1,
    projectId,
    subjectType,
    deliverables: selectedPlatforms.flatMap((platform) => selectedFormats.map((format) => ({ id: `${platform}-${format}`, platform, format, status: 'planned' }))),
  };
}
