import { GoogleGenAI } from '@google/genai';
import { buildSoundtrackBrief, inferMusicStyle } from '../src/musicDirector.js';

function text(value){return String(value ?? '').trim();}
function clamp(value,min,max){const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));}

function promptForMusic(request, analysis, duration){
  return `You are the soundtrack director inside a GENERAL-PURPOSE AI FILMMAKER. Create a plan for ORIGINAL music that supports the supplied edit.

USER REQUEST:
${text(request)||'Create a cinematic soundtrack that fits the supplied media.'}

MEDIA CONTEXT:
${JSON.stringify(analysis||{},null,2)}

TARGET DURATION: ${duration} seconds

Rules:
- Return a musical blueprint, not an existing recording.
- Do not copy, interpolate, recreate or closely imitate any named copyrighted song, melody, lyrics, riff, vocal performance or distinctive composition.
- If the user names a song or artist, translate that request into generic characteristics such as genre, instrumentation, tempo range, energy, mood and structure.
- Prefer a concrete BPM, genre, mood, instrumentation, energy curve and section structure.
- The music must be useful for an editor: provide downbeat-aware sections and a stable beat grid.

Return ONLY JSON:
{"genre":"","bpm":120,"mood":"","energy":0.7,"instrumentation":[],"sections":[{"id":"intro","start":0,"end":2,"energy":0.5,"purpose":""}],"editEvents":[{"time":0,"type":"entry"},{"time":2,"type":"build"},{"time":6,"type":"drop"},{"time":12,"type":"hero"}]}`;
}

function normalizePlan(plan, fallback, duration){
  const bpm=clamp(plan?.bpm,fallback.bpm,60,180); const energy=clamp(plan?.energy,fallback.energy,0,1);
  const sections=Array.isArray(plan?.sections)?plan.sections.map((s,i)=>({id:text(s?.id)||`section-${i+1}`,start:clamp(s?.start,0,0,duration),end:clamp(s?.end,duration,0,duration),energy:clamp(s?.energy,energy,0,1),purpose:text(s?.purpose)||'musical section'})).filter(s=>s.end>s.start):fallback.sections;
  const events=Array.isArray(plan?.editEvents)?plan.editEvents.map(e=>({time:clamp(e?.time,0,0,duration),type:text(e?.type)||'cut'})).sort((a,b)=>a.time-b.time):[];
  return {...fallback,genre:text(plan?.genre)||fallback.genre,bpm,mood:text(plan?.mood)||fallback.mood,energy,instrumentation:Array.isArray(plan?.instrumentation)?plan.instrumentation.map(text).filter(Boolean).slice(0,12):[],sections,editEvents:events};
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({success:false,error:'Method not allowed'});
  try{
    const {GEMINI_API_KEY}=process.env;
    const {prompt='',analysis={},targetDuration=15}=req.body||{};
    const duration=clamp(targetDuration,15,5,60);
    const fallback=buildSoundtrackBrief({prompt,duration,...inferMusicStyle(prompt)});
    if(!GEMINI_API_KEY)return res.status(200).json({success:true,source:'local-fallback',soundtrack:fallback});
    const ai=new GoogleGenAI({apiKey:GEMINI_API_KEY});
    const result=await ai.models.generateContent({model:'gemini-2.5-flash',contents:promptForMusic(prompt,analysis,duration)});
    const raw=text(result?.text); let plan={};
    try{plan=JSON.parse(raw.replace(/^```json\s*/i,'').replace(/```$/,'').trim());}catch{plan={};}
    const soundtrack=normalizePlan(plan,fallback,duration);
    return res.status(200).json({success:true,source:'gemini',soundtrack});
  }catch(error){console.error('[MUSIC-PLAN] ERROR',error);return res.status(200).json({success:true,source:'local-fallback',warning:error?.message||'Gemini music planning unavailable.',soundtrack:buildSoundtrackBrief({prompt:req.body?.prompt,duration:req.body?.targetDuration})});}
}
