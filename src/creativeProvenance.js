export function createProvenance(asset={},source='original'){return {assetId:asset.id||null,source,originId:asset.originId||asset.id||null,generated:Boolean(asset.generated),derivedFrom:asset.derivedFrom||null};}
export function attachProvenance(items=[],source){return items.map(item=>({...item,provenance:createProvenance(item,source)}));}
