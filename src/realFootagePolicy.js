/* Real footage policy: generated inserts are opt-in, never accidental. */
export function resolveSceneSourcePolicy({useGeneratedScenes=false,allowGeneratedInserts=false,mediaItems=[]}={}){
 const hasReal=Array.isArray(mediaItems)&&mediaItems.some(m=>m?.file||m?.sourceUrl||String(m?.type||'').startsWith('video')||String(m?.mimeType||'').startsWith('video/'));
 return {hasRealFootage:hasReal,generatedScenesEnabled:Boolean(useGeneratedScenes&&allowGeneratedInserts),primarySource:hasReal?'uploaded-media':(useGeneratedScenes?'generated':'none'),reason:hasReal&&!useGeneratedScenes?'Real uploaded media remains primary; generated scenes are disabled by default.':'Explicit generation policy required for generated scenes.'};
}
export function filterGeneratedInserts(scenes=[],policy={}){if(policy.generatedScenesEnabled)return Array.isArray(scenes)?scenes:[];return (Array.isArray(scenes)?scenes:[]).filter(s=>s?.sourceType!=='generated'&&s?.type!=='generated-scene');}
