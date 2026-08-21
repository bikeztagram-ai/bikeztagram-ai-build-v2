/* Unified asset identity used by Director, Music, Scene Generation and Timeline systems. */
export function createCreativeAssetManifest({assets=[],subjects=[],references=[],style={}}={}){
 return {version:'creative-asset-manifest-v2',assets:assets.map((a,i)=>({id:a.id||`asset-${i+1}`,type:a.type||'unknown',url:a.url||null,duration:Number(a.duration)||0,aspectRatio:a.aspectRatio||null,role:a.role||'source'})),subjects, references, style};
}
export function getSubjectIds(manifest){return (manifest?.subjects||[]).map(s=>s.id).filter(Boolean);}
export function findAsset(manifest,id){return (manifest?.assets||[]).find(a=>a.id===id)||null;}
