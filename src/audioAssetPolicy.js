/* BIKEZTAGRAM AI — audio asset gate. */
const text=v=>String(v??'').toLowerCase().trim();
export function classifyAudioAsset(asset={}){const source=text(asset.source||asset.type),name=text(asset.name||asset.title);if(asset.userSupplied||/user|upload|owned/.test(source))return{allowed:true,reason:'user-supplied'};if(asset.originalGenerated||/original|generated|procedural/.test(source))return{allowed:true,reason:'original-generated'};if(/spotify|youtube|commercial|licensed|copyrighted|known-song/.test(source+' '+name))return{allowed:false,reason:'known-or-unverified-licensed-music'};return{allowed:false,reason:'unverified-audio-license'};}
export function filterAudioAssets(assets=[]){return(Array.isArray(assets)?assets:[]).map(asset=>({...asset,policy:classifyAudioAsset(asset)}));}
