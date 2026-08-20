/* BIKEZTAGRAM AI — safe output selection/export controller. */
import { formatRenderedFilm } from './postRenderTranscoder.js';
import { resolveOutputPreset } from './outputPresets.js';
import { downloadSocialFilm, shareSocialFilm } from './socialExport.js';
export async function prepareSocialExport(blob,{preset='portrait',prompt='',name='bikeztagram-ai-film',onProgress}={}){const target=resolveOutputPreset(preset,prompt);const formatted=await formatRenderedFilm(blob,{preset:target.id,prompt,onProgress});return{...formatted,info:{preset:target.id,width:target.width,height:target.height,aspectRatio:target.aspectRatio,name}};}
export async function downloadPreparedFilm(blob,options={}){const prepared=await prepareSocialExport(blob,options);return downloadSocialFilm(prepared.blob,{presetId:'portrait',name:options.name||'bikeztagram-ai-film'});}
export async function sharePreparedFilm(blob,options={}){const prepared=await prepareSocialExport(blob,options);return shareSocialFilm(prepared.blob,{presetId:'portrait',name:options.name||'bikeztagram-ai-film'});}
