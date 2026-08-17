/* Group assets into reusable creative buckets before story planning. */
export function groupCreativeAssets(assets = []) {
  const groups = { hero:[], supporting:[], detail:[], atmosphere:[], audio:[], unknown:[] };
  assets.forEach((asset)=>{ const role=asset.role || (asset.type?.startsWith('audio/')?'audio': asset.detail ? 'detail' : asset.atmosphere ? 'atmosphere' : asset.quality >= .8 ? 'hero' : 'supporting'); (groups[role] || groups.unknown).push(asset); });
  return groups;
}
