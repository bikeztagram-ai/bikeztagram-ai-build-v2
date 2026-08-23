import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || min)); }
function text(value) { return String(value ?? '').trim(); }

const GEMINI_ANALYSIS_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];

function isTransientGeminiError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('503') || message.includes('unavailable') || message.includes('high demand') || message.includes('429') || message.includes('resource_exhausted') || message.includes('rate limit') || message.includes('overloaded');
}

async function generateWithGeminiFailover(ai, request, label) {
  const failures = [];
  for (const model of GEMINI_ANALYSIS_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[${label}] Trying Gemini model ${model}, attempt ${attempt}`);
        const response = await ai.models.generateContent({ ...request, model });
        console.log(`[${label}] Gemini model succeeded: ${model}`);
        return { response, model };
      } catch (error) {
        const message = error?.message || String(error);
        failures.push(`${model} attempt ${attempt}: ${message}`);
        console.warn(`[${label}] ${model} failed:`, message);
        if (!isTransientGeminiError(error)) throw error;
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
      }
    }
  }
  throw new Error(`Gemini media analysis is temporarily unavailable after trying ${GEMINI_ANALYSIS_MODELS.join(', ')}. ${failures.join(' | ')}`);
}

function buildStage2Prompt(prompt, analysis, targetDuration = 15) {
  const target = clamp(targetDuration, 5, 60);
  return `You are the final AI edit director for BIKEZTAGRAM AI, a GENERAL-PURPOSE AI FILMMAKER.\n\nA separate Gemini stage has already watched the ACTUAL uploaded media. Stage 1 produced the verified analysis below. You are Stage 2.\n\nYour job is NOT to invent footage. Select and direct only moments Stage 1 actually verified.\n\nUSER CREATIVE REQUEST:\n${text(prompt) || 'Create an exciting cinematic social-media video.'}\n\nTARGET DURATION: ${target} seconds\n\nVERIFIED STAGE 1 ANALYSIS:\n${JSON.stringify(analysis, null, 2)}\n\nDIRECTOR RULES:\n- Treat the uploaded subject generically: it may be a vehicle, animal, person, travel scene, landscape, product, event, object, architecture, food, or mixed media.\n- Build a coherent story appropriate to the actual material: hook → build → reveal/action/emotion → hero ending where supported.\n- Prefer different timestamps, viewpoints and distinct source moments.\n- Never repeat the same exact moment.\n- Select shots for their editorial ROLE, not merely their score.\n- Never invent a subject, action, location, camera move, object, event or visual detail that Stage 1 did not verify.\n- Preserve subject identity and continuity using Stage 1's verified identity and attributes as the source of truth.\n- Preserve environment, lighting, screen direction and visible appearance where continuity matters.\n- Keep each cut between 0.5 and 4 seconds.\n- Use 3–6 cuts when enough verified moments exist; maximum 8.\n- Use exact timestamps inside the supplied bestMoments.\n- Allowed transitions: hard-cut, fade-in, fade-out, dip-black, crossfade.\n- Allowed motion: static, slow-push, slow-pull, pan-left, pan-right, tilt-up, tilt-down.\n- Speed must be 0.5–1.5.\n- Keep text minimal and relevant to the user's request.\n\nReturn ONLY valid JSON in this structure:\n{\n  "title": "",\n  "style": "",\n  "colorGrade": "",\n  "editorialStructure": ["hook", "build", "reveal", "action", "hero"],\n  "textOverlay": "",\n  "cuts": [{"momentIndex":0,"startTime":0,"endTime":2,"duration":2,"purpose":"hook","transition":"fade-in","motionStyle":"static","speed":1,"text":""}]\n}`;
}

function validateStage2Plan(plan, analysis, targetDuration) {
  const moments = Array.isArray(analysis?.bestMoments) ? analysis.bestMoments : [];
  const target = clamp(targetDuration, 5, 60);
  const transitions = new Set(['hard-cut', 'fade-in', 'fade-out', 'dip-black', 'crossfade']);
  const motions = new Set(['static', 'slow-push', 'slow-pull', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down']);
  const seen = new Set();
  const cuts = (Array.isArray(plan?.cuts) ? plan.cuts : []).map((cut) => {
    const momentIndex = Number(cut?.momentIndex);
    if (!Number.isInteger(momentIndex) || momentIndex < 0 || momentIndex >= moments.length) return null;
    const moment = moments[momentIndex];
    const momentStart = Number(moment?.start), momentEnd = Number(moment?.end);
    if (!Number.isFinite(momentStart) || !Number.isFinite(momentEnd) || momentEnd <= momentStart) return null;
    const requestedStart = Number(cut?.startTime), requestedEnd = Number(cut?.endTime);
    const startTime = Number.isFinite(requestedStart) ? Math.max(momentStart, Math.min(requestedStart, momentEnd - 0.1)) : momentStart;
    const endTime = Number.isFinite(requestedEnd) ? Math.max(startTime + 0.1, Math.min(requestedEnd, momentEnd)) : momentEnd;
    const duration = Math.max(0.5, Math.min(4, Number(cut?.duration) || endTime - startTime));
    const key = `${momentIndex}:${Math.round(startTime * 4) / 4}:${Math.round(endTime * 4) / 4}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return { momentIndex, startTime:Number(startTime.toFixed(2)), endTime:Number(endTime.toFixed(2)), duration:Number(duration.toFixed(2)), purpose:text(cut?.purpose)||'cinematic', transition:transitions.has(text(cut?.transition))?text(cut.transition):'hard-cut', motionStyle:motions.has(text(cut?.motionStyle))?text(cut?.motionStyle):'static', speed:Math.max(0.5,Math.min(1.5,Number(cut?.speed)||1)), text:text(cut?.text) };
  }).filter(Boolean).slice(0,8);
  if (!cuts.length) return null;
  return { title:text(plan?.title)||'Bikeztagram AI Cinematic Edit', style:text(plan?.style)||'cinematic', colorGrade:text(plan?.colorGrade)||'cinematic', editorialStructure:Array.isArray(plan?.editorialStructure)?plan.editorialStructure.map(text).filter(Boolean).slice(0,8):[], textOverlay:text(plan?.textOverlay), cuts, targetDuration:target, sourceSelection:{exactMomentCount:cuts.length,uniqueMomentCount:new Set(cuts.map(c=>c.momentIndex)).size}, stage:'two-stage-gemini-director' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({success:false,error:'Method not allowed'});
  try {
    const apiKey=process.env.GEMINI_API_KEY;
    if(!apiKey)return res.status(500).json({success:false,error:'GEMINI_API_KEY is missing.'});
    const {videoUrl='',blobUrl='',pathname='',filename='video.mp4',mimeType='video/mp4',prompt='',targetDuration=15}=req.body||{};
    const actualVideoUrl=videoUrl||blobUrl;
    if(!actualVideoUrl)return res.status(400).json({success:false,error:'No public Blob video URL was supplied.'});
    console.log('[ANALYSE] Public Blob video URL received.');
    console.log('[ANALYSE] Blob pathname:',pathname);
    console.log('[ANALYSE] Downloading video from Blob...');
    const blobResponse=await fetch(actualVideoUrl);
    if(!blobResponse.ok)throw new Error(`Could not download the uploaded Blob video. HTTP ${blobResponse.status}`);
    const contentType=blobResponse.headers.get('content-type')||mimeType||'video/mp4';
    const videoArrayBuffer=await blobResponse.arrayBuffer();
    const videoBuffer=Buffer.from(videoArrayBuffer);
    if(!videoBuffer.length)throw new Error('Downloaded Blob video was empty.');
    console.log('[ANALYSE] Video downloaded successfully:',videoBuffer.length,'bytes');
    const ai=new GoogleGenAI({apiKey});
    console.log('[ANALYSE] Uploading video to Gemini...');
    let videoFile=await ai.files.upload({file:new Blob([videoBuffer],{type:contentType}),config:{mimeType:contentType,displayName:filename}});
    if(!videoFile?.name)throw new Error('Gemini did not return a valid uploaded file.');
    for(let attempt=0;attempt<60;attempt++){
      const state=String(videoFile?.state||'').toUpperCase();
      console.log('[ANALYSE] Gemini processing state:',state,'attempt:',attempt+1);
      if(state==='ACTIVE')break;
      if(state==='FAILED')throw new Error('Gemini failed while processing the video.');
      await new Promise(resolve=>setTimeout(resolve,2000));
      videoFile=await ai.files.get({name:videoFile.name});
    }
    const finalState=String(videoFile?.state||'').toUpperCase();
    if(finalState!=='ACTIVE')throw new Error('Gemini video processing timed out.');
    if(!videoFile?.uri)throw new Error('Gemini returned no video URI.');
    console.log('[ANALYSE] Gemini video is ACTIVE and ready.');

    const analysisPrompt=`You are Stage 1 of the BIKEZTAGRAM AI GENERAL-PURPOSE AI FILMMAKER.\n\nAnalyse the ACTUAL uploaded media supplied to you.\n\nIMPORTANT:\n- The media may contain ANY subject: vehicle, motorcycle, car, animal, puppy, person, travel, landscape, product, event, object, architecture, food, or mixed media.\n- Identify what is actually visible rather than assuming the subject from the filename.\n- Do not invent actions, objects, locations or details.\n- Determine the strongest usable moments from the actual media and give precise timestamps.\n- Evaluate the material as a filmmaker preparing it for a later AI Director stage.\n- Preserve uncertainty when something cannot be confidently identified.\n- The universal subject record is the source of truth for downstream editing. Do not force every subject into a vehicle/person schema.\n\nAnalyse:\n1. Primary subject(s), identity and defining visual attributes\n2. Secondary subject(s)\n3. Subject category and confidence\n4. Scene/environment and continuity anchors\n5. Shot types and composition\n6. Camera movement, angle and direction\n7. Stability and framing quality\n8. What actually happens, with timestamps where possible\n9. Action/movement intensity\n10. Emotional or narrative moments\n11. Lighting, colour and visual quality\n12. Sharpness and subject visibility\n13. Cinematic potential\n14. Best moments and exact timestamps\n15. Editorial role for each best moment\n16. Suggested duration and speed\n17. Whether slow motion helps\n18. Text recommendation\n19. Transition recommendation\n20. Camera-motion recommendation\n21. Subject continuity considerations\n22. Environment continuity considerations\n23. Weak, repetitive or unusable footage to avoid\n\nUSER CREATIVE REQUEST:\n${prompt}\n\nReturn ONLY valid JSON using this structure:\n{\n "filename":"${filename}",\n "durationSeconds":0,\n "mediaType":"video",\n "subjects":[{"label":"","category":"","description":"","identity":"","attributes":[],"confidence":0,"importance":"primary"}],\n "subject":{"primarySubject":"","category":"","description":"","identity":"","attributes":[],"confidence":0},\n "scene":{"environment":"","locationType":"","timeOfDay":"","lighting":"","continuityAnchors":[]},\n "shots":[{"start":0,"end":0,"type":"","cameraMovement":"","cameraAngle":"","screenDirection":"","stability":"","composition":"","subjectVisibility":""}],\n "verifiedEvents":[{"start":0,"end":0,"description":"","confidence":0}],\n "action":"",\n "narrative":{"tone":"","emotion":"","storyPotential":""},\n "visualQuality":{"composition":"","lighting":"","colour":"","sharpness":"","subjectVisibility":"","cinematicPotential":""},\n "cinematicScore":0,\n "bestMoments":[{"start":0,"end":0,"description":"","reason":"","editorialRole":"","subject":"","shotType":"","score":0}],\n "editingRecommendation":{"role":"","suggestedDuration":0,"speed":1,"slowMotion":false,"reason":""},\n "textRecommendation":{"useText":false,"text":"","reason":""},\n "transitionRecommendation":"",\n "motionRecommendation":"",\n "continuityNotes":"",\n "avoid":"",\n "editorialNotes":""\n}`;

    console.log('[ANALYSE] Sending actual media to Gemini Stage 1 with automatic model failover...');
    const stage1 = await generateWithGeminiFailover(ai, {
      contents:createUserContent([createPartFromUri(videoFile.uri,videoFile.mimeType||contentType),analysisPrompt]),
    }, 'ANALYSE-STAGE1');
    const response=stage1.response;
    let modelText=String(response?.text||'').replace(/```json/gi,'').replace(/```/g,'').trim();
    if(!modelText)throw new Error('Gemini returned no analysis.');
    let analysis;try{analysis=JSON.parse(modelText);}catch{console.error('[ANALYSE] Gemini returned:',modelText);throw new Error('Gemini returned invalid analysis JSON.');}
    console.log('[ANALYSE] Stage 1 analysis completed with',stage1.model,'. Starting Stage 2 director pass...');
    let stage2Plan=null;
    let stage2Model=null;
    try{
      const stage2=await generateWithGeminiFailover(ai, {contents:buildStage2Prompt(prompt,analysis,targetDuration),config:{responseMimeType:'application/json'}}, 'ANALYSE-STAGE2');
      stage2Model=stage2.model;
      const stage2Text=String(stage2.response?.text||'').replace(/```json/gi,'').replace(/```/g,'').trim();
      if(stage2Text)stage2Plan=validateStage2Plan(JSON.parse(stage2Text),analysis,targetDuration);
      if(!stage2Plan)console.warn('[ANALYSE] Stage 2 produced no valid verified plan; local director fallback remains available.');
      else console.log('[ANALYSE] Stage 2 verified director plan created:',stage2Plan.cuts.length,'cuts using',stage2Model);
    }catch(stage2Error){console.warn('[ANALYSE] Stage 2 failed safely; returning Stage 1 analysis for local fallback:',stage2Error?.message||stage2Error);}
    analysis.filename=filename;
    analysis.aiEditPlan=stage2Plan;
    analysis.directorPipeline={stages:['actual-media-analysis','verified-edit-direction'],stage1:`${stage1.model}-media-analysis`,stage2:stage2Plan?`${stage2Model}-verified-director`:'unavailable-safe-local-fallback',generatedScenesAllowed:false,sourceOfTruth:'uploaded-media',architecture:'universal-ai-filmmaker'};
    console.log('[ANALYSE] Universal two-stage AI filmmaker pipeline completed successfully.');
    return res.status(200).json({success:true,analysis});
  }catch(error){console.error('========================================');console.error('[ANALYSE] BIKEZTAGRAM MEDIA ANALYSIS ERROR');console.error('Message:',error?.message||error);console.error('Stack:',error?.stack||'No stack trace');console.error('========================================');return res.status(500).json({success:false,error:error?.message||'Unknown media analysis error.'});}
}
