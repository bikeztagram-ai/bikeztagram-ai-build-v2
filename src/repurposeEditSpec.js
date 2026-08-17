export function buildRepurposeEditSpec(candidate={}, source={}) {
  const duration=Math.max(1,Number(candidate.duration||15));
  const start=Math.max(0,Number(candidate.start||source.start||0));
  return {version:1,id:candidate.id||null,sourceAssetId:source.assetId||source.id||null,range:{start,end:start+duration},format:candidate.format||'vertical',hook:candidate.hook||null,captionSafeArea:true,reframe:{mode:'subject-aware'},audio:{duckMusic:true},status:'ready-for-director'};
}
