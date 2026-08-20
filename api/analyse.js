import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || min));
}

function text(value) {
  return String(value ?? '').trim();
}

function buildStage2Prompt(prompt, analysis, targetDuration = 15) {
  const target = clamp(targetDuration, 5, 60);
  return `You are the final AI edit director for BIKEZTAGRAM AI.

A separate Gemini stage has already watched the ACTUAL uploaded motorcycle video. Stage 1 produced the verified analysis below. You are Stage 2.

Your job is NOT to invent footage. Select and direct only moments that Stage 1 actually verified.

USER CREATIVE REQUEST:
${text(prompt) || 'Create an exciting cinematic motorcycle social-media edit.'}

TARGET DURATION: ${target} seconds

VERIFIED STAGE 1 ANALYSIS:
${JSON.stringify(analysis, null, 2)}

DIRECTOR RULES:
- Build a coherent story: hook → build → reveal/action → hero ending where the verified footage supports it.
- Prefer different timestamps and distinct source moments.
- Never repeat the same exact moment.
- Use the strongest verified moments first, but preserve editorial variety.
- Preserve the real motorcycle as the visual subject.
- Never invent a camera move, action, location, rider, motorcycle detail or event that Stage 1 did not verify.
- Keep each cut between 0.5 and 4 seconds.
- Use 3–6 cuts when enough verified moments exist; maximum 8.
- Use exact timestamps inside the supplied bestMoments.
- Allowed transitions: hard-cut, fade-in, fade-out, dip-black, crossfade.
- Allowed motion: static, slow-push, slow-pull, pan-left, pan-right, tilt-up, tilt-down.
- Speed must be 0.5–1.5.
- Keep text minimal.

Return ONLY valid JSON in this structure:
{
  "title": "",
  "style": "",
  "colorGrade": "",
  "editorialStructure": ["hook", "build", "action", "hero"],
  "textOverlay": "",
  "cuts": [
    {
      "momentIndex": 0,
      "startTime": 0,
      "endTime": 2,
      "duration": 2,
      "purpose": "hook",
      "transition": "fade-in",
      "motionStyle": "static",
      "speed": 1,
      "text": ""
    }
  ]
}`;
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
    const momentStart = Number(moment?.start);
    const momentEnd = Number(moment?.end);
    if (!Number.isFinite(momentStart) || !Number.isFinite(momentEnd) || momentEnd <= momentStart) return null;

    const requestedStart = Number(cut?.startTime);
    const requestedEnd = Number(cut?.endTime);
    const startTime = Number.isFinite(requestedStart) ? Math.max(momentStart, Math.min(requestedStart, momentEnd - 0.1)) : momentStart;
    const endTime = Number.isFinite(requestedEnd) ? Math.max(startTime + 0.1, Math.min(requestedEnd, momentEnd)) : momentEnd;
    const duration = Math.max(0.5, Math.min(4, Number(cut?.duration) || endTime - startTime));
    const key = `${momentIndex}:${Math.round(startTime * 4) / 4}:${Math.round(endTime * 4) / 4}`;
    if (seen.has(key)) return null;
    seen.add(key);

    return {
      momentIndex,
      startTime: Number(startTime.toFixed(2)),
      endTime: Number(endTime.toFixed(2)),
      duration: Number(duration.toFixed(2)),
      purpose: text(cut?.purpose) || 'cinematic',
      transition: transitions.has(text(cut?.transition)) ? text(cut.transition) : 'hard-cut',
      motionStyle: motions.has(text(cut?.motionStyle)) ? text(cut.motionStyle) : 'static',
      speed: Math.max(0.5, Math.min(1.5, Number(cut?.speed) || 1)),
      text: text(cut?.text)
    };
  }).filter(Boolean).slice(0, 8);

  if (!cuts.length) return null;

  return {
    title: text(plan?.title) || 'Bikeztagram AI Cinematic Edit',
    style: text(plan?.style) || 'cinematic',
    colorGrade: text(plan?.colorGrade) || 'cinematic',
    editorialStructure: Array.isArray(plan?.editorialStructure) ? plan.editorialStructure.map(text).filter(Boolean).slice(0, 8) : [],
    textOverlay: text(plan?.textOverlay),
    cuts,
    targetDuration: target,
    sourceSelection: {
      exactMomentCount: cuts.length,
      uniqueMomentCount: new Set(cuts.map((cut) => cut.momentIndex)).size
    },
    stage: 'two-stage-gemini-director'
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing.' });

    const { videoUrl = '', blobUrl = '', pathname = '', filename = 'video.mp4', mimeType = 'video/mp4', prompt = '', targetDuration = 15 } = req.body || {};
    const actualVideoUrl = videoUrl || blobUrl;
    if (!actualVideoUrl) return res.status(400).json({ success: false, error: 'No public Blob video URL was supplied.' });

    console.log('[ANALYSE] Public Blob video URL received.');
    console.log('[ANALYSE] Blob pathname:', pathname);
    console.log('[ANALYSE] Downloading video from Blob...');

    const blobResponse = await fetch(actualVideoUrl);
    if (!blobResponse.ok) throw new Error(`Could not download the uploaded Blob video. HTTP ${blobResponse.status}`);
    const contentType = blobResponse.headers.get('content-type') || mimeType || 'video/mp4';
    const videoArrayBuffer = await blobResponse.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);
    if (!videoBuffer.length) throw new Error('Downloaded Blob video was empty.');

    console.log('[ANALYSE] Video downloaded successfully:', videoBuffer.length, 'bytes');

    const ai = new GoogleGenAI({ apiKey });

    console.log('[ANALYSE] Uploading video to Gemini...');
    let videoFile = await ai.files.upload({
      file: new Blob([videoBuffer], { type: contentType }),
      config: { mimeType: contentType, displayName: filename }
    });
    if (!videoFile?.name) throw new Error('Gemini did not return a valid uploaded file.');

    console.log('[ANALYSE] Gemini file uploaded:', videoFile.name);

    for (let attempt = 0; attempt < 60; attempt++) {
      const state = String(videoFile?.state || '').toUpperCase();
      console.log('[ANALYSE] Gemini processing state:', state, 'attempt:', attempt + 1);
      if (state === 'ACTIVE') break;
      if (state === 'FAILED') throw new Error('Gemini failed while processing the video.');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      videoFile = await ai.files.get({ name: videoFile.name });
    }

    const finalState = String(videoFile?.state || '').toUpperCase();
    if (finalState !== 'ACTIVE') throw new Error('Gemini video processing timed out.');
    if (!videoFile?.uri) throw new Error('Gemini returned no video URI.');

    console.log('[ANALYSE] Gemini video is ACTIVE and ready.');

    const analysisPrompt = `
You are the AI Director for BIKEZTAGRAM AI.

Analyse the ACTUAL motorcycle video supplied to you.

IMPORTANT RULES:
- Analyse the actual video.
- Do not rely on the filename.
- Do not invent anything that is not visible.
- Do not assume the motorcycle model unless it is actually recognisable.
- Use the actual footage to determine the best moments.
- Give timestamps based on the actual video.

Analyse:
1. Motorcycle and rider visibility
2. Motorcycle model if recognisable
3. Shot type
4. Camera movement
5. Camera angle
6. Stability
7. What actually happens in the footage
8. Acceleration
9. Cornering
10. Passing
11. Riding action
12. Composition
13. Lighting
14. Sharpness
15. Subject visibility
16. Cinematic potential
17. Best moments and timestamps
18. Best editing role
19. Suggested duration
20. Suggested playback speed
21. Whether slow motion would help
22. Text recommendation
23. Transition recommendation
24. Camera-motion recommendation

USER REQUEST:
${prompt}

Return ONLY valid JSON.
Use exactly this structure:
{
  "filename": "${filename}",
  "durationSeconds": 0,
  "subject": {"motorcycleVisible": false,"riderVisible": false,"motorcycleModel": "","description": ""},
  "shot": {"type": "","cameraMovement": "","cameraAngle": "","stability": ""},
  "action": "",
  "visualQuality": {"composition": "","lighting": "","sharpness": "","subjectVisibility": "","cinematicPotential": ""},
  "cinematicScore": 0,
  "bestMoments": [{"start": 0,"end": 0,"description": "","reason": ""}],
  "editingRecommendation": {"role": "","suggestedDuration": 0,"speed": 1,"slowMotion": false,"reason": ""},
  "textRecommendation": {"useText": false,"text": "","reason": ""},
  "transitionRecommendation": "",
  "motionRecommendation": "",
  "editorialNotes": ""
}`;

    console.log('[ANALYSE] Sending actual video to Gemini generateContent for Stage 1...');
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: createUserContent([
        createPartFromUri(videoFile.uri, videoFile.mimeType || contentType),
        analysisPrompt
      ])
    });

    let modelText = String(response?.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    if (!modelText) throw new Error('Gemini returned no analysis.');

    let analysis;
    try {
      analysis = JSON.parse(modelText);
    } catch (parseError) {
      console.error('[ANALYSE] Gemini returned:', modelText);
      throw new Error('Gemini returned invalid analysis JSON.');
    }

    console.log('[ANALYSE] Stage 1 analysis completed. Starting Stage 2 director pass...');

    // Stage 2 deliberately uses text + verified Stage 1 results. This avoids re-uploading the
    // video, keeps the existing Blob/Gemini video-analysis path intact, and makes the two-stage
    // workflow deterministic: Stage 2 can only select timestamps Stage 1 actually found.
    let stage2Plan = null;
    try {
      const stage2Response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: buildStage2Prompt(prompt, analysis, targetDuration),
        config: { responseMimeType: 'application/json' }
      });
      const stage2Text = String(stage2Response?.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
      if (stage2Text) {
        const parsedStage2 = JSON.parse(stage2Text);
        stage2Plan = validateStage2Plan(parsedStage2, analysis, targetDuration);
      }
      if (!stage2Plan) console.warn('[ANALYSE] Stage 2 produced no valid verified plan; local director fallback remains available.');
      else console.log('[ANALYSE] Stage 2 verified director plan created:', stage2Plan.cuts.length, 'cuts.');
    } catch (stage2Error) {
      console.warn('[ANALYSE] Stage 2 failed safely; returning Stage 1 analysis for local fallback:', stage2Error?.message || stage2Error);
    }

    analysis.filename = filename;
    analysis.aiEditPlan = stage2Plan;
    analysis.directorPipeline = {
      stages: ['actual-video-analysis', 'verified-edit-direction'],
      stage1: 'gemini-3.6-flash-video-analysis',
      stage2: stage2Plan ? 'gemini-3.6-flash-verified-director' : 'unavailable-safe-local-fallback',
      generatedScenesAllowed: false,
      sourceOfTruth: 'uploaded-video'
    };

    console.log('[ANALYSE] Gemini two-stage analysis pipeline completed successfully.');
    return res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error('========================================');
    console.error('[ANALYSE] BIKEZTAGRAM VIDEO ANALYSIS ERROR');
    console.error('Message:', error?.message || error);
    console.error('Stack:', error?.stack || 'No stack trace');
    console.error('========================================');
    return res.status(500).json({ success: false, error: error?.message || 'Unknown video analysis error.' });
  }
}
