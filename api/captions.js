import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai';
import { get } from '@vercel/blob';

const text=(v)=>String(v??'').trim();
const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};

function pathnameFromInput(pathname,url){const supplied=text(pathname);if(supplied)return supplied.replace(/^\/+/, '');try{return decodeURIComponent(new URL(text(url)).pathname).replace(/^\/+/, '');}catch{return '';}}
async function readPrivateBlob(pathname){if(!pathname)throw new Error('No Blob pathname was supplied for private video read.');const result=await get(pathname,{access:'private',useCache:false});if(!result?.stream)throw new Error('Vercel Blob returned no readable stream.');const chunks=[];if(typeof result.stream.getReader==='function'){const reader=result.stream.getReader();try{while(true){const part=await reader.read();if(part.done)break;if(part.value)chunks.push(Buffer.from(part.value));}}finally{reader.releaseLock?.();}}else{for await(const part of result.stream)chunks.push(Buffer.from(part));}const bytes=Buffer.concat(chunks);if(!bytes.length)throw new Error('Private Blob video read returned an empty object.');return{bytes,contentType:text(result?.blob?.contentType)};}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Method not allowed'});
  try{
    const apiKey=process.env.GEMINI_API_KEY;
    if(!apiKey)return res.status(500).json({success:false,error:'GEMINI_API_KEY is missing.'});
    const{videoUrl='',pathname='',filename='video.mp4',mimeType='video/mp4'}=req.body||{};
    if(!videoUrl)return res.status(400).json({success:false,error:'No Blob video URL was supplied.'});
    const blob=await readPrivateBlob(pathnameFromInput(pathname,videoUrl));
    const contentType=blob.contentType||mimeType||'video/mp4';
    const ai=new GoogleGenAI({apiKey});
    let file=await ai.files.upload({file:new Blob([blob.bytes],{type:contentType}),config:{mimeType:contentType,displayName:filename}});
    if(!file?.name||!file?.uri)throw new Error('Gemini did not return a valid caption-analysis file.');
    for(let attempt=0;attempt<60;attempt++){
      const state=String(file?.state||'').toUpperCase();
      if(state==='ACTIVE')break;
      if(state==='FAILED')throw new Error('Gemini failed while processing the video for captions.');
      await new Promise(resolve=>setTimeout(resolve,1500));
      file=await ai.files.get({name:file.name});
    }
    if(String(file?.state||'').toUpperCase()!=='ACTIVE')throw new Error('Gemini caption analysis timed out.');
    const prompt=`You are the speech-caption stage of BIKEZTAGRAM AI.\nAnalyse ONLY the actual uploaded video.\nIf spoken dialogue, narration or clearly audible speech is present, transcribe it into short social-video caption cues with precise timestamps.\nIf there is no speech, return an empty cues array.\nDo not invent words. Preserve uncertainty by lowering confidence or omitting unclear speech.\nDo not reproduce song lyrics unless they are spoken dialogue; music vocals must not be transcribed as lyrics.\nKeep each cue short enough for a mobile social caption, normally 2–9 words.\nReturn ONLY valid JSON:\n{"hasSpeech":false,"language":"","cues":[{"start":0,"end":1,"text":"","confidence":0.95}],"notes":""}`;
    const result=await ai.models.generateContent({model:'gemini-3.6-flash',contents:createUserContent([createPartFromUri(file.uri,file.mimeType||contentType),prompt]),config:{responseMimeType:'application/json'}});
    const raw=text(result?.text).replace(/```json/gi,'').replace(/```/g,'').trim();
    if(!raw)throw new Error('Gemini returned no caption analysis.');
    let parsed;try{parsed=JSON.parse(raw)}catch{throw new Error('Gemini returned invalid caption JSON.');}
    const cues=Array.isArray(parsed?.cues)?parsed.cues.map((cue,index)=>({start:Math.max(0,num(cue?.start)),end:Math.max(Math.max(0,num(cue?.start))+.05,num(cue?.end)),text:text(cue?.text),confidence:Math.max(0,Math.min(1,num(cue?.confidence,0)))})).filter(c=>c.text).slice(0,120):[];
    return res.status(200).json({success:true,hasSpeech:Boolean(parsed?.hasSpeech&&cues.length),language:text(parsed?.language),cues,notes:text(parsed?.notes),source:'gemini-verified-video-speech'});
  }catch(error){
    console.error('[CAPTIONS]',error?.message||error);
    return res.status(500).json({success:false,error:error?.message||'Unknown caption analysis error.'});
  }
}
