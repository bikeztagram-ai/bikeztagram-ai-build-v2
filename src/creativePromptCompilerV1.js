/* Converts a natural-language creative request into deterministic orchestration inputs.
 * It does not call an AI model itself; it creates the stable request contract for one.
 */
export function compileCreativeBrief({prompt='',duration=15,aspectRatio='9:16',assets=[],preferences={}}={}){
 const text=String(prompt).trim();
 return {version:'creative-brief-v1',prompt:text,duration:Math.max(1,Math.min(120,Number(duration)||15)),aspectRatio,assetIds:assets.map(a=>a.id).filter(Boolean),preferences,requirements:{generateMusic:true,allowGeneratedScenes:true,preserveUserSubjects:true,creativeQA:true,autonomousRevision:true}};
}
