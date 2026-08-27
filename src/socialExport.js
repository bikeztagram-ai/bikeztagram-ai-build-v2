/* BIKEZTAGRAM AI — social export helpers. The protected 9:16 renderer remains the default. */
import { OUTPUT_PRESETS } from './outputPresets.js';

export const safeFilename=(value)=>String(value||'bikeztagram-ai-film').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'bikeztagram-ai-film';
export const SOCIAL_PRESETS=Object.freeze(Object.fromEntries(Object.entries(OUTPUT_PRESETS).map(([id,p])=>[id,{...p,extension:'webm',mimeType:'video/webm'}])));

export function getSocialExportInfo(blob,presetId='portrait'){
 const preset=SOCIAL_PRESETS[presetId]||SOCIAL_PRESETS.portrait;const mime=String(blob?.type||'').toLowerCase();const extension=mime.includes('mp4')?'mp4':preset.extension;
 const baseName = 'bikeztagram-ai-film';
 return{
  ...preset,
  mimeType:blob?.type||preset.mimeType,
  extension,
  sizeBytes:Number(blob?.size||0),
  formatLabel:extension.toUpperCase(),
  filename: `${safeFilename(baseName)}-${preset.width}x${preset.height}.${extension}`,
  timestamp: new Date().toISOString(),
  exportId: `export-${preset.id}-${blob?.size || 0}`
 };
}

export async function validateExportedVideo(blob, presetId = 'portrait') {
 if (!(blob instanceof Blob) || !blob.size) throw new Error('Export validation failed: Video blob is empty or invalid.');
 const preset = SOCIAL_PRESETS[presetId] || SOCIAL_PRESETS.portrait;
 const results = { valid: true, sizeBytes: blob.size, presetId, width: preset.width, height: preset.height, duration: 0, durationAgreement: true };
 if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const video = document.createElement('video'); video.preload = 'auto'; video.playsInline = true;
  const url = URL.createObjectURL(blob); video.src = url;
  try {
   await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Export validation timed out.')), 5000);
    video.onloadedmetadata = () => { clearTimeout(t); resolve(); };
    video.onerror = () => { clearTimeout(t); reject(new Error('Exported video decoding error.')); };
   });
   results.width = video.videoWidth; results.height = video.videoHeight; results.duration = video.duration;
   if (!Number.isFinite(video.duration) || video.duration <= 0) {
    results.durationAgreement = false; throw new Error('Export validation failed: Video has zero or infinite duration.');
   }
   if (video.videoWidth !== preset.width || video.videoHeight !== preset.height) {
    throw new Error(`Export validation failed: Dimensions mismatch. Expected ${preset.width}x${preset.height}, got ${video.videoWidth}x${video.videoHeight}.`);
   }
  } finally {
   try { video.pause(); } catch {}
   try { video.removeAttribute('src'); video.load(); } catch {}
   URL.revokeObjectURL(url);
  }
 }
 return results;
}

export function downloadSocialFilm(blob,{presetId='portrait',name='bikeztagram-ai-film'}={}){
 if(!(blob instanceof Blob)||!blob.size)throw new Error('No finished film is available to export.');const info=getSocialExportInfo(blob,presetId);const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`${safeFilename(name)}-${info.width}x${info.height}.${info.extension}`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return info;
}
export async function shareSocialFilm(blob,{presetId='portrait',name='bikeztagram-ai-film'}={}){
 if(!(blob instanceof Blob)||!blob.size)throw new Error('No finished film is available to share.');if(!navigator.share)throw new Error('This device/browser does not provide native sharing.');const info=getSocialExportInfo(blob,presetId);const file=new File([blob],`${safeFilename(name)}-${info.width}x${info.height}.${info.extension}`,{type:info.mimeType});if(navigator.canShare&&!navigator.canShare({files:[file]}))throw new Error('This device cannot share the rendered video file directly.');await navigator.share({title:'Bikeztagram AI film',text:'Created with Bikeztagram AI',files:[file]});return info;
}
