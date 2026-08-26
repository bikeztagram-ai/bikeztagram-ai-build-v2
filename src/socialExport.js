/* BIKEZTAGRAM AI — social export helpers. The protected 9:16 renderer remains the default. */
import { OUTPUT_PRESETS } from './outputPresets.js';

const safeFilename=(value)=>String(value||'bikeztagram-ai-film').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'bikeztagram-ai-film';
export const SOCIAL_PRESETS=Object.freeze(Object.fromEntries(Object.entries(OUTPUT_PRESETS).map(([id,p])=>[id,{...p,extension:'webm',mimeType:'video/webm'}])));

export function getSocialExportInfo(blob,presetId='portrait'){
  const preset=SOCIAL_PRESETS[presetId]||SOCIAL_PRESETS.portrait;
  const mime=String(blob?.type||'').toLowerCase();
  const extension=mime.includes('mp4')?'mp4':preset.extension;
  return{...preset,mimeType:blob?.type||preset.mimeType,extension,sizeBytes:Number(blob?.size||0),formatLabel:extension.toUpperCase()};
}

export function validateSocialExport(blob,presetId='portrait'){
  const info=getSocialExportInfo(blob,presetId);
  if(!(blob instanceof Blob)||!blob.size)throw new Error('No finished film is available for delivery.');
  if(!String(info.mimeType||'').toLowerCase().startsWith('video/'))throw new Error('Finished film is not a supported video file.');
  if(info.sizeBytes<1024)throw new Error('Finished film is unexpectedly small and may be incomplete.');
  if(!Number.isFinite(Number(info.width))||!Number.isFinite(Number(info.height))||info.width<=0||info.height<=0)throw new Error('Selected social output has invalid dimensions.');
  return info;
}

export function buildSocialFilename(name,info){
  const stem=safeFilename(name);
  return `${stem}-${info.width}x${info.height}.${info.extension}`;
}

export function downloadSocialFilm(blob,{presetId='portrait',name='bikeztagram-ai-film'}={}){
  const info=validateSocialExport(blob,presetId);
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=buildSocialFilename(name,info);
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return info;
}

export async function shareSocialFilm(blob,{presetId='portrait',name='bikeztagram-ai-film'}={}){
  const info=validateSocialExport(blob,presetId);
  if(!navigator.share)throw new Error('This device/browser does not provide native sharing.');
  const file=new File([blob],buildSocialFilename(name,info),{type:info.mimeType});
  if(navigator.canShare&&!navigator.canShare({files:[file]}))throw new Error('This device cannot share the rendered video file directly.');
  await navigator.share({title:'Bikeztagram AI film',text:'Created with Bikeztagram AI',files:[file]});
  return info;
}
