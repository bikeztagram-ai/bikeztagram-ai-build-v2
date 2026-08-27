/* BIKEZTAGRAM AI — social export helpers. The protected 9:16 renderer remains the default. */
import { OUTPUT_PRESETS } from './outputPresets.js';

const safeFilename=(value)=>String(value||'bikeztagram-ai-film').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'bikeztagram-ai-film';
export const SOCIAL_PRESETS=Object.freeze(Object.fromEntries(Object.entries(OUTPUT_PRESETS).map(([id,p])=>[id,{...p,extension:'webm',mimeType:'video/webm'}])));
export function getSocialExportInfo(blob,presetId='portrait'){
 const preset=SOCIAL_PRESETS[presetId]||SOCIAL_PRESETS.portrait;const mime=String(blob?.type||'').toLowerCase();const extension=mime.includes('mp4')?'mp4':preset.extension;
 return{...preset,mimeType:blob?.type||preset.mimeType,extension,sizeBytes:Number(blob?.size||0),formatLabel:extension.toUpperCase()};
}
export function downloadSocialFilm(blob,{presetId='portrait',name='bikeztagram-ai-film'}={}){
 if(!(blob instanceof Blob)||!blob.size)throw new Error('No finished film is available to export.');const info=getSocialExportInfo(blob,presetId);const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`${safeFilename(name)}-${info.width}x${info.height}.${info.extension}`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return info;
}
export async function shareSocialFilm(blob,{presetId='portrait',name='bikeztagram-ai-film'}={}){
 if(!(blob instanceof Blob)||!blob.size)throw new Error('No finished film is available to share.');if(!navigator.share)throw new Error('This device/browser does not provide native sharing.');const info=getSocialExportInfo(blob,presetId);const file=new File([blob],`${safeFilename(name)}-${info.width}x${info.height}.${info.extension}`,{type:info.mimeType});if(navigator.canShare&&!navigator.canShare({files:[file]}))throw new Error('This device cannot share the rendered video file directly.');await navigator.share({title:'Bikeztagram AI film',text:'Created with Bikeztagram AI',files:[file]});return info;
}

export function validateSocialExport(blob,presetId='portrait'){
 const info=getSocialExportInfo(blob,presetId);
 const failures=[];
 if(!(blob instanceof Blob)||!blob.size)failures.push('empty-output');
 if(!Number.isFinite(Number(info.width))||!Number.isFinite(Number(info.height)))failures.push('invalid-dimensions');
 if(Number(info.width)<=0||Number(info.height)<=0)failures.push('invalid-dimensions');
 if(!['portrait','square','landscape'].includes(presetId))failures.push('unknown-profile');
 return {ok:failures.length===0,failures,info};
}

export function validateSocialExportDuration(actualSeconds,targetSeconds,tolerance=0.25){
 const actual=Number(actualSeconds),target=Number(targetSeconds),allowed=Math.max(Number(tolerance)||0,0);
 if(!Number.isFinite(actual)||actual<0||!Number.isFinite(target)||target<=0)return {ok:false,reason:'invalid-duration'};
 return {ok:Math.abs(actual-target)<=allowed,actualSeconds:actual,targetSeconds:target,tolerance:allowed,reason:Math.abs(actual-target)<=allowed?null:'duration-mismatch'};
}

export function getSocialExportProfiles(){
 return Object.freeze(Object.fromEntries(Object.entries(SOCIAL_PRESETS).map(([id,p])=>[id,{id,label:p.label,width:p.width,height:p.height,aspectRatio:p.aspectRatio,platforms:[...(p.platforms||[])]}])));
}

export function buildSocialFilename(name,presetId='portrait',extension='mp4'){
 const info=SOCIAL_PRESETS[presetId]||SOCIAL_PRESETS.portrait;
 const base=safeFilename(name);
 const ext=String(extension||info.extension||'mp4').replace(/[^a-z0-9]/gi,'').toLowerCase()||'mp4';
 return `${base}-${info.width}x${info.height}.${ext}`;
}

export function validateSocialFilename(filename){
 const value=String(filename||'');
 return {ok:value.length>0&&value.length<=100&&!/[\\/:*?"<>|]/.test(value),filename:value,reason:value.length===0?'empty':value.length>100?'too-long':/[\\/:*?"<>|]/.test(value)?'unsafe-character':null};
}
