/* Derive multiple deliverables from one canonical project. */
const DERIVATIVES = Object.freeze({ hero: { ratio:'16:9', duration:null }, reel: { ratio:'9:16', duration:60 }, teaser: { ratio:'9:16', duration:15 }, square: { ratio:'1:1', duration:30 }, trailer: { ratio:'16:9', duration:30 } });
export function deriveCampaign(project = {}, requested = Object.keys(DERIVATIVES)) {
  return requested.filter((key) => DERIVATIVES[key]).map((kind) => { const spec = DERIVATIVES[kind]; return { id:`${project.id || 'project'}-${kind}`, sourceProjectId:project.id || null, kind, ratio:spec.ratio, duration:spec.duration || project.duration || 30, status:'planned' }; });
}
