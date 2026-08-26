/* BIKEZTAGRAM AI — post-render output formatter. */
import { OUTPUT_PRESETS, resolveOutputPreset } from './outputPresets.js';

function pickMime(){
  const choices=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  return choices.find((m)=>typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported?.(m))||'';
}
function mediaCapture(video){
  const fn=video.captureStream||video.mozCaptureStream;
  return typeof fn==='function'?fn.call(video):null;
}
function waitForEvent(target,event,timeoutMs=20000){
  return new Promise((resolve,reject)=>{
    let timer;
    const cleanup=()=>{clearTimeout(timer);target.removeEventListener(event,onEvent);};
    const onEvent=()=>{cleanup();resolve();};
    timer=setTimeout(()=>{cleanup();reject(new Error(`Timed out waiting for media ${event}.`));},timeoutMs);
    target.addEventListener(event,onEvent,{once:true});
  });
}
function validateOutputBlob(blob,target){
  if(!(blob instanceof Blob)||!blob.size)throw new Error(`The ${target.label} export produced an empty file.`);
  if(!String(blob.type||'').toLowerCase().startsWith('video/'))throw new Error(`The ${target.label} export produced an invalid video MIME type.`);
  return blob;
}

export async function formatRenderedFilm(blob,{preset='portrait',prompt='',fps=30,onProgress}={}){
  if(!(blob instanceof Blob)||!blob.size)throw new Error('No finished render is available.');
  const target=resolveOutputPreset(preset,prompt);
  if(target.id==='portrait')return{blob,preset:target,transcoded:false,audioPreserved:null};
  if(typeof document==='undefined'||typeof MediaRecorder==='undefined')throw new Error('Browser video formatting is unavailable.');
  const safeFps=Math.max(15,Math.min(60,Number(fps)||30));
  const video=document.createElement('video');
  video.playsInline=true;
  video.preload='auto';
  video.muted=false;
  const sourceUrl=URL.createObjectURL(blob);
  video.src=sourceUrl;
  let canvasStream=null;
  let sourceStream=null;
  let recorder=null;
  let animationFrame=0;
  try{
    await waitForEvent(video,'loadedmetadata',20000);
    const duration=Number(video.duration);
    if(!Number.isFinite(duration)||duration<=0)throw new Error('Finished render has no usable duration.');
    const canvas=document.createElement('canvas');
    canvas.width=target.width;canvas.height=target.height;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Output canvas is unavailable.');
    sourceStream=mediaCapture(video);
    canvasStream=canvas.captureStream(safeFps);
    const audioTracks=sourceStream?.getAudioTracks?.()||[];
    audioTracks.forEach((track)=>canvasStream.addTrack(track));
    const mime=pickMime();
    if(!mime)throw new Error('No supported browser video encoder is available.');
    const chunks=[];
    recorder=new MediaRecorder(canvasStream,{mimeType:mime,videoBitsPerSecond:8000000});
    recorder.ondataavailable=(event)=>{if(event.data?.size)chunks.push(event.data);};
    const stopped=new Promise((resolve,reject)=>{
      recorder.addEventListener('stop',resolve,{once:true});
      recorder.addEventListener('error',()=>reject(new Error('Output formatting recorder failed.')),{once:true});
    });
    const sw=()=>video.videoWidth||1080,sh=()=>video.videoHeight||1920;
    const draw=()=>{
      const sourceWidth=sw(),sourceHeight=sh();
      const scale=Math.max(target.width/sourceWidth,target.height/sourceHeight);
      const drawWidth=sourceWidth*scale,drawHeight=sourceHeight*scale;
      ctx.fillStyle='#000';ctx.fillRect(0,0,target.width,target.height);
      ctx.drawImage(video,(target.width-drawWidth)/2,(target.height-drawHeight)/2,drawWidth,drawHeight);
      onProgress?.(Math.min(99,Math.round((video.currentTime/duration)*100)));
      if(!video.ended&&!video.paused)animationFrame=requestAnimationFrame(draw);
    };
    video.currentTime=0;
    await video.play();
    recorder.start(250);
    draw();
    await waitForEvent(video,'ended',Math.max(20000,duration*1000+10000));
    cancelAnimationFrame(animationFrame);
    if(recorder.state!=='inactive')recorder.stop();
    await stopped;
    const output=validateOutputBlob(new Blob(chunks,{type:mime}),target);
    onProgress?.(100);
    return{blob:output,preset:target,transcoded:true,audioPreserved:Boolean(audioTracks.length),mimeType:mime,durationSeconds:Number(duration.toFixed(2))};
  }finally{
    cancelAnimationFrame(animationFrame);
    try{if(recorder&&recorder.state!=='inactive')recorder.stop();}catch{}
    try{canvasStream?.getTracks?.().forEach((track)=>track.stop());}catch{}
    try{sourceStream?.getTracks?.().forEach((track)=>track.stop());}catch{}
    try{video.pause();}catch{}
    try{video.removeAttribute('src');video.load();}catch{}
    URL.revokeObjectURL(sourceUrl);
  }
}

export function getOutputPresetOptions(){
  return Object.values(OUTPUT_PRESETS).map(({id,label,width,height,aspectRatio,platforms})=>({id,label,width,height,aspectRatio,platforms}));
}
