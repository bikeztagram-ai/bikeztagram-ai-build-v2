/* BIKEZTAGRAM AI — Stage 2 Creative Director.
   Product layer only. Blob upload and Stage 1 video analysis are untouched.
*/

function text(value) { return String(value ?? '').trim(); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function safeNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function cleanJson(raw) { return String(raw || '').replace(/```json/gi, '').replace(/```/g, '').trim(); }

function wantsGeneratedWorld(creativeRequest) {
  return /\b(generate|generated|world|mars|space|alien|cyber|futuristic|sci[- ]?fi|drone|fantasy|virtual|synthetic|new environment|different environment|cut.?out)\b/i.test(creativeRequest)
    && !/\b(no|without|don't|do not)\s+(generate|generated|world|background|cut.?out)\b/i.test(creativeRequest);
}

function normalise(plan, analysis, creativeRequest, targetDuration) {
  if (!plan || !Array.isArray(plan.scenes) || !plan.scenes.length) throw new Error('Gemini Creative Director returned no scenes.');
  const sourceDuration = clamp(safeNumber(analysis?.durationInSeconds ?? analysis?.durationSeconds, 11), 3, 60);
  const target = clamp(safeNumber(targetDuration, 15), 5, 60);
  const allowGenerated = wantsGeneratedWorld(creativeRequest);
  const transitions = new Set(['hard-cut','fade-in','fade-out','crossfade','dip-black','flash-cut','whip-left','whip-right','zoom-punch','match-cut']);
  const motion = new Set(['static','slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down']);

  const scenes = plan.scenes.slice(0, 10).map((raw, index) => {
    const sourceType = raw?.sourceType === 'generated' && allowGenerated ? 'generated' : 'uploaded';
    let startTime = null; let endTime = null;
    let duration = clamp(safeNumber(raw?.duration, 1.5), 0.5, 6);
    if (sourceType === 'uploaded') {
      startTime = clamp(safeNumber(raw?.startTime, 0), 0, Math.max(0, sourceDuration - 0.5));
      endTime = clamp(safeNumber(raw?.endTime, startTime + duration), startTime + 0.5, sourceDuration);
      duration = clamp(Math.min(duration, endTime - startTime), 0.5, 6);
      endTime = Number((startTime + duration).toFixed(2));
    }
    return {
      id: text(raw?.id) || `scene-${String(index + 1).padStart(2, '0')}`,
      sourceType,
      purpose: text(raw?.purpose) || (sourceType === 'uploaded' ? 'real-footage' : 'original-cinematic-fill'),
      duration: Number(duration.toFixed(2)), startTime, endTime,
      generationPrompt: sourceType === 'generated' ? text(raw?.generationPrompt) : '',
      continuityNotes: text(raw?.continuityNotes) || 'Preserve the supplied motorcycle and natural background as the identity anchor.',
      transitionIn: transitions.has(text(raw?.transitionIn)) ? text(raw?.transitionIn) : (index === 0 ? 'fade-in' : 'hard-cut'),
      transitionOut: transitions.has(text(raw?.transitionOut)) ? text(raw?.transitionOut) : 'hard-cut',
      motionStyle: motion.has(text(raw?.motionStyle)) ? text(raw?.motionStyle) : 'static',
      motionIntensity: clamp(safeNumber(raw?.motionIntensity, 0.9), 0, 1.5),
      speed: clamp(safeNumber(raw?.speed, 1), 0.5, 1.5),
      priority: text(raw?.priority) || 'required'
    };
  });

  if (!scenes.some((scene) => scene.sourceType === 'uploaded')) {
    scenes.unshift({ id:'scene-01', sourceType:'uploaded', purpose:'real-opening', duration:1.5, startTime:0,
      endTime:Math.min(1.5, sourceDuration), generationPrompt:'', continuityNotes:'Establish the real supplied motorcycle first.',
      transitionIn:'fade-in', transitionOut:'hard-cut', motionStyle:'static', motionIntensity:0.8, speed:1, priority:'required' });
  }

  let total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  if (total > target) {
    for (let i = scenes.length - 1; i >= 0 && total > target; i -= 1) {
      const minimum = scenes[i].priority === 'required' ? 0.7 : 0.5;
      const reduction = Math.min(Math.max(0, scenes[i].duration - minimum), total - target);
      scenes[i].duration = Number((scenes[i].duration - reduction).toFixed(2));
      if (scenes[i].sourceType === 'uploaded' && scenes[i].startTime != null) scenes[i].endTime = Number((scenes[i].startTime + scenes[i].duration).toFixed(2));
      total -= reduction;
    }
  }

  return {
    version:'10.0-real-footage-first', title:text(plan.title) || 'Bikeztagram AI Director', creativeRequest,
    creativeDirection:text(plan.creativeDirection) || 'Stage 1 analysed the actual footage; Stage 2 directed the edit from that verified analysis and the user creative request.',
    targetDuration:target, plannedDuration:Number(total.toFixed(2)), worldMode:text(plan.worldMode) || 'real-footage-cinematic',
    style:plan.style && typeof plan.style === 'object' ? plan.style : { cinematic:true },
    subjectContinuity:{ primarySubject:text(analysis?.subject?.description) || text(analysis?.subject?.motorcycleModel) || 'the uploaded motorcycle', motorcycleModel:text(analysis?.subject?.motorcycleModel), motorcycleVisible:analysis?.subject?.motorcycleVisible !== false, riderVisible:analysis?.subject?.riderVisible === true },
    sourceAnalysis:{ filename:text(analysis?.filename), durationSeconds:safeNumber(analysis?.durationInSeconds ?? analysis?.durationSeconds,0), strongestMoments:Array.isArray(analysis?.bestMoments) ? analysis.bestMoments.slice(0,8) : [] },
    scenes, directorNotes:Array.isArray(plan.directorNotes) ? plan.directorNotes.map(text).filter(Boolean).slice(0,12) : [],
    directorSource:'gemini-stage-2',
    mode:allowGenerated ? 'creative-hybrid' : 'real-footage-first',
    generationPolicy:{ paidVideoGeneration:false, externalVideoGenerator:false, generatedScenesAllowed:allowGenerated, rule:'Real uploaded footage is the default. Generated scenes are allowed only when the user explicitly asks for a generated world/environment/subject treatment. Generated material must be original and must not reproduce named copyrighted characters, vehicles, logos, scenes or soundtracks.' }
  };
}

async function askGemini(analysis, creativeRequest, targetDuration) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing.');
  const allowGenerated = wantsGeneratedWorld(creativeRequest);
  const directorPrompt = `You are the second-stage Creative Director for BIKEZTAGRAM AI.

Stage 1 has ALREADY analysed the ACTUAL uploaded motorcycle video. The analysis below is verified. Do not invent footage or timestamps.

USER CREATIVE REQUEST:\n${creativeRequest}\n\nTARGET DURATION:\n${targetDuration} seconds\n\nGENERATED-SCENE MODE:\n${allowGenerated ? 'ON — the user explicitly requested generated/world/subject material.' : 'OFF — use ONLY the supplied real footage. Do not create generated scenes, backgrounds, cut-outs or replacement environments.'}\n\nVERIFIED STAGE 1 ANALYSIS:\n${JSON.stringify(analysis, null, 2)}

Now design the actual edit. Select the strongest real moments, do not simply use upload order, avoid weak/repetitive footage, and build hook → build → escalation/action → hero ending where supported. Use exact timestamps from verified bestMoments. Use purposeful transitions, varied cinematic motion and useful speed changes. Keep the real motorcycle and its natural background unless generated mode is ON. Do not crop out the motorcycle by default. Prefer intelligent reframing of the real frame.

If GENERATED-SCENE MODE is OFF, every scene MUST have sourceType="uploaded", a real timestamp, and an empty generationPrompt.
If GENERATED-SCENE MODE is ON, generated scenes may be used only when they genuinely improve the requested concept.
Never copy a named game, film, TV show, character, logo, vehicle or soundtrack. Keep the motorcycle recognisable and consistent.

Return ONLY valid JSON in this structure:
{"title":"","creativeDirection":"","worldMode":"real-footage-cinematic","style":{"cinematic":true,"dark":true,"energy":0.8},"directorNotes":[],"scenes":[{"id":"scene-01","sourceType":"uploaded","purpose":"hook","startTime":0,"endTime":1.5,"duration":1.5,"transitionIn":"fade-in","transitionOut":"hard-cut","motionStyle":"slow-push","motionIntensity":0.9,"speed":1,"priority":"required","generationPrompt":"","continuityNotes":""}]}

For uploaded scenes, startTime/endTime MUST be inside a bestMoments interval. Generated scenes use null timestamps. Maximum 10 scenes, prefer 4–7. Duration 0.5–6 seconds. Speed 0.5–1.5. Allowed transitions: hard-cut, fade-in, fade-out, crossfade, dip-black, flash-cut, whip-left, whip-right, zoom-punch, match-cut. Allowed motion: static, slow-push, slow-pull, pan-left, pan-right, tilt-up, tilt-down.`;

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
    method:'POST', headers:{'Content-Type':'application/json','X-goog-api-key':apiKey},
    body:JSON.stringify({contents:[{role:'user',parts:[{text:directorPrompt}]}],generationConfig:{responseMimeType:'application/json'}})
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Gemini Creative Director HTTP ${response.status}: ${raw.slice(0,600)}`);
  let payload; try { payload = JSON.parse(raw); } catch { throw new Error('Gemini Creative Director returned invalid API JSON.'); }
  const modelText = payload?.candidates?.[0]?.content?.parts?.find((part)=>typeof part.text==='string')?.text || '';
  if (!modelText) throw new Error('Gemini Creative Director returned no plan text.');
  try { return JSON.parse(cleanJson(modelText)); } catch { throw new Error('Gemini Creative Director returned invalid plan JSON.'); }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({success:false,error:'Method not allowed'});
  try {
    const body = req.body || {};
    const analysis = body.analysis;
    const creativeRequest = text(body.prompt) || 'Create the strongest cinematic motorcycle social-media edit from the supplied footage.';
    const targetDuration = clamp(safeNumber(body.targetDuration,15),5,60);
    if (!analysis || typeof analysis !== 'object') return res.status(400).json({success:false,error:'Verified Stage 1 video analysis is required.'});
    console.log('[DIRECTOR] Stage 2 request received.', {filename:analysis?.filename,duration:analysis?.durationInSeconds ?? analysis?.durationSeconds,bestMoments:Array.isArray(analysis?.bestMoments)?analysis.bestMoments.length:0,generatedMode:wantsGeneratedWorld(creativeRequest)});
    const modelPlan = await askGemini(analysis, creativeRequest, targetDuration);
    const productionPlan = normalise(modelPlan, analysis, creativeRequest, targetDuration);
    console.log('[DIRECTOR] Stage 2 plan created.', {scenes:productionPlan.scenes.length,plannedDuration:productionPlan.plannedDuration,mode:productionPlan.mode,generatedScenes:productionPlan.scenes.filter((s)=>s.sourceType==='generated').length});
    return res.status(200).json({success:true,productionPlan});
  } catch (error) {
    console.error('[DIRECTOR] Stage 2 ERROR:',error?.message || error);
    return res.status(500).json({success:false,error:error?.message || 'Creative Director failed.'});
  }
}
