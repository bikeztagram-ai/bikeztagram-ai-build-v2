export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success:false,error:'Method not allowed' });
  try {
    const apiKey=process.env.GEMINI_API_KEY;
    if(!apiKey)return res.status(500).json({success:false,error:'GEMINI_API_KEY is missing in Vercel settings.'});
    const {prompt='',analysis=null,targetDuration=15}=req.body||{};
    if(!analysis||typeof analysis!=='object')return res.status(400).json({success:false,error:'No Gemini video analysis was supplied.'});
    const availableMoments=Array.isArray(analysis.bestMoments)?analysis.bestMoments:[];
    const target=Math.max(5,Math.min(60,Number(targetDuration)||15));
    const directorPrompt=`You are the final AI edit director for BIKEZTAGRAM AI.
A separate Gemini stage already watched the ACTUAL uploaded motorcycle footage. Use ONLY the verified analysis below; do not invent footage.
USER CREATIVE REQUEST:\n${prompt||'Create an exciting cinematic motorcycle social-media edit.'}
TARGET DURATION: ${target} seconds
VERIFIED VIDEO ANALYSIS:\n${JSON.stringify(analysis,null,2)}

Create a coherent story using verified moments: hook, build, reveal, escalation/action, hero ending where supported. Prefer different source clips and different timestamps. Do not repeat the same exact moment. Preserve the real motorcycle as the subject. Use 3–6 cuts when enough verified moments exist, maximum 8. Use exact timestamps inside each supplied bestMoment. Return ONLY JSON with title, style, colorGrade, textOverlay and cuts. Each cut: momentIndex,startTime,endTime,duration,purpose,transition,motionStyle,speed,text. duration 0.5–4 seconds, speed 0.5–1.5. Allowed transitions: hard-cut,fade-in,fade-out,dip-black,crossfade. Allowed motion: static,slow-push,slow-pull,pan-left,pan-right,tilt-up,tilt-down. Minimal text.`;
    const geminiResponse=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','X-goog-api-key':apiKey},body:JSON.stringify({contents:[{role:'user',parts:[{text:directorPrompt}]}],generationConfig:{responseMimeType:'application/json'}})});
    const responseText=await geminiResponse.text();
    if(!geminiResponse.ok){console.error('[EDIT PLAN] Gemini API error:',responseText.slice(0,2000));return res.status(500).json({success:false,error:`Gemini error ${geminiResponse.status}: ${responseText.slice(0,500)}`});}
    let geminiData;try{geminiData=JSON.parse(responseText)}catch{return res.status(500).json({success:false,error:'Gemini returned invalid response JSON.'})}
    let modelText=geminiData?.candidates?.[0]?.content?.parts?.find(p=>typeof p.text==='string')?.text||'';modelText=String(modelText).replace(/```json/gi,'').replace(/```/g,'').trim();
    let plan;try{plan=JSON.parse(modelText)}catch{return res.status(500).json({success:false,error:'Gemini created an invalid edit plan.'})}
    if(!plan||!Array.isArray(plan.cuts)||!plan.cuts.length)return res.status(500).json({success:false,error:'Gemini did not create any usable cuts.'});
    const validTransitions=new Set(['hard-cut','fade-in','fade-out','dip-black','crossfade']);const validMotionStyles=new Set(['static','slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down']);const seen=new Set();const seenSources=new Set();
    plan.cuts=plan.cuts.map(cut=>{const momentIndex=Number(cut.momentIndex);if(!Number.isInteger(momentIndex)||momentIndex<0||momentIndex>=availableMoments.length)return null;const moment=availableMoments[momentIndex];const momentStart=Number(moment?.start),momentEnd=Number(moment?.end);if(!Number.isFinite(momentStart)||!Number.isFinite(momentEnd)||momentEnd<=momentStart)return null;const rs=Number(cut.startTime),re=Number(cut.endTime);const startTime=Number.isFinite(rs)?Math.max(momentStart,Math.min(rs,momentEnd)):momentStart;const endTime=Number.isFinite(re)?Math.max(startTime+.1,Math.min(re,momentEnd)):momentEnd;const duration=Math.max(.5,Math.min(4,Number(cut.duration)||Math.min(2,endTime-startTime)));const key=`${momentIndex}:${Math.round(startTime*2)/2}`;if(seen.has(key))return null;seen.add(key);seenSources.add(String(moment?.mediaIndex??moment?.mediaId??'unknown'));return{momentIndex,startTime,endTime,duration,purpose:String(cut.purpose||'cinematic'),transition:validTransitions.has(String(cut.transition))?String(cut.transition):'hard-cut',motionStyle:validMotionStyles.has(String(cut.motionStyle))?String(cut.motionStyle):'static',speed:Math.max(.5,Math.min(1.5,Number(cut.speed)||1)),text:String(cut.text||'')};}).filter(Boolean).slice(0,8);
    if(!plan.cuts.length)return res.status(500).json({success:false,error:'Gemini returned no cuts linked to verified video moments.'});
    plan.targetDuration=target;plan.sourceSelection={uniqueSourceCount:seenSources.size,exactMomentCount:plan.cuts.length};
    return res.status(200).json({success:true,plan});
  }catch(error){console.error('[EDIT PLAN] Error:',error);return res.status(500).json({success:false,error:error?.message||'Unknown edit-plan error.'})}
}
