/*
 * Bikeztagram AI — Creative Director command endpoint.
 *
 * This endpoint deliberately performs no paid generation. It converts a natural
 * language request plus lightweight asset metadata into the same provider-neutral
 * film plan used by the browser runtime. The UI can adopt this endpoint without
 * changing the protected Blob/Gemini/render path.
 */
import { planCompleteFilm, buildCreativeDirectorSummary } from '../src/creativeFilmOrchestratorV2.js';

const json=(value,fallback)=>Array.isArray(value)?value:fallback;
const text=value=>String(value??'').trim();

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Method not allowed'});
  try{
    const body=req.body||{};
    const prompt=text(body.prompt);
    const duration=Number(body.duration)||15;
    const aspectRatio=['9:16','1:1','16:9'].includes(body.aspectRatio)?body.aspectRatio:'9:16';
    const assets=json(body.assets,[]).slice(0,200).map((asset,index)=>({
      id:text(asset?.id)||`asset-${index+1}`,
      name:text(asset?.name||asset?.filename||asset?.title),
      type:text(asset?.type||asset?.mimeType),
      duration:Number(asset?.duration)||0,
      width:Number(asset?.width)||0,
      height:Number(asset?.height)||0,
      subjectId:text(asset?.subjectId),
      subjectLabel:text(asset?.subjectLabel),
      sourceId:text(asset?.sourceId)
    }));
    const plan=planCompleteFilm({prompt,assets,duration,aspectRatio});
    return res.status(200).json({success:true,source:'creative-director-v2-local',plan,summary:buildCreativeDirectorSummary(plan),deployment:'manual-only'});
  }catch(error){
    return res.status(400).json({success:false,error:error?.message||'Creative Director planning failed.'});
  }
}
