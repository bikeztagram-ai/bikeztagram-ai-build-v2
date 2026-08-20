/* BIKEZTAGRAM AI — post-render output formatter. */
import { OUTPUT_PRESETS, resolveOutputPreset } from './outputPresets.js';
function pickMime(){const choices=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];return choices.find((m)=>typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported?.(m))||'';}
function mediaCapture(video){const fn=video.captureStream||video.mozCaptureStream;return typeof fn==='function'?fn.call(video):null;}
export async function formatRenderedFilm(blob,{preset='portrait',prompt='',fps=30,onProgress}={}){
 if(!(blob instanceof Blob)||!blob.size)throw new Error('No finished render is available.');
 const target=resolveOutputPreset(preset,prompt);if(target.id==='portrait')return{blob,preset:target,transcoded:false};
 if(typeof document==='undefined'||typeof MediaRecorder==='undefined')throw new Error('Browser video formatting is unavailable.');
 const video=document.createElement('video');video.playsInline=true;video.preload='auto';const sourceUrl=URL.createObjectURL(blob);video.src=sourceUrl;
 await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(new Error('Finished render could not be decoded for output formatting.'));});
 const canvas=document.createElement('canvas');canvas.width=target.width;canvas.height=target.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Output canvas is unavailable.');
 const videoStream=mediaCapture(video),canvasStream=canvas.captureStream(fps);const audioTracks=videoStream?.getAudioTracks?.()||[];audioTracks.forEach((track)=>canvasStream.addTrack(track));
 const mime=pickMime();if(!mime)throw new Error('No supported browser video encoder is available.');const chunks=[];const recorder=new MediaRecorder(canvasStream,{mimeType:mime,videoBitsPerSecond:8000000});recorder.ondataavailable=(e)=>{if(e.data?.size)chunks.push(e.data);};
 const ended=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=()=>reject(new Error('Output formatting recorder failed.'));});const duration=Number(video.duration)||1;
 const draw=()=>{const sw=video.videoWidth||1080,sh=video.videoHeight||1920,scale=Math.max(target.width/sw,target.height/sh),dw=sw*scale,dh=sh*scale;ctx.fillStyle='#000';ctx.fillRect(0,0,target.width,target.height);ctx.drawImage(video,(target.width-dw)/2,(target.height-dh)/2,dw,dh);onProgress?.(Math.min(99,Math.round(video.currentTime/duration*100)));};
 recorder.start(250);await video.play();const timer=setInterval(draw,Math.max(20,Math.round(1000/fps)));draw();await new Promise((resolve)=>{video.onended=resolve;});clearInterval(timer);draw();await new Promise((r)=>setTimeout(r,120));recorder.stop();await ended;canvasStream.getTracks().forEach((t)=>t.stop());video.pause();URL.revokeObjectURL(sourceUrl);onProgress?.(100);
 return{blob:new Blob(chunks,{type:mime}),preset:target,transcoded:true,audioPreserved:Boolean(audioTracks.length)};
}
export function getOutputPresetOptions(){return Object.values(OUTPUT_PRESETS).map(({id,label,width,height,aspectRatio,platforms})=>({id,label,width,height,aspectRatio,platforms}));}
