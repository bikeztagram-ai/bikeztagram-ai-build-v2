/* BIKEZTAGRAM AI — safe output selection/export controller. */
import { formatRenderedFilm } from './postRenderTranscoder.js';
import { resolveOutputPreset } from './outputPresets.js';
import { downloadSocialFilm, shareSocialFilm } from './socialExport.js';

export async function prepareSocialExport(blob,{preset='portrait',prompt='',name='bikeztagram-ai-film',onProgress}={}){
  const target=resolveOutputPreset(preset,prompt);
  try {
    const formatted=await formatRenderedFilm(blob,{preset:target.id,prompt,onProgress});
    return{...formatted,info:{preset:target.id,width:target.width,height:target.height,aspectRatio:target.aspectRatio,name}};
  } catch (err) {
    console.warn('[EXPORT CONTROLLER] Transcoding failed, falling back to original render:', err);
    return {
      blob,
      preset: resolveOutputPreset('portrait'),
      transcoded: false,
      audioPreserved: true,
      recoveryFallback: true,
      recoveryReason: err?.message || String(err),
      info: { preset: 'portrait', width: 1080, height: 1920, aspectRatio: '9:16', name }
    };
  }
}

export async function downloadPreparedFilm(blob,options={}){const prepared=await prepareSocialExport(blob,options);return downloadSocialFilm(prepared.blob,{presetId:prepared.info.preset||'portrait',name:options.name||'bikeztagram-ai-film'});}
export async function sharePreparedFilm(blob,options={}){const prepared=await prepareSocialExport(blob,options);return shareSocialFilm(prepared.blob,{presetId:prepared.info.preset||'portrait',name:options.name||'bikeztagram-ai-film'});}
