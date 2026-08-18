import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing.' });

    const { videoUrl = '', blobUrl = '', pathname = '', filename = 'video.mp4', mimeType = 'video/mp4', prompt = '' } = req.body || {};
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

    const ai = new GoogleGenAI({ apiKey });
    let videoFile = await ai.files.upload({ file: new Blob([videoBuffer], { type: contentType }), config: { mimeType: contentType, displayName: filename } });
    if (!videoFile?.name) throw new Error('Gemini did not return a valid uploaded file.');

    for (let attempt = 0; attempt < 60; attempt++) {
      const state = String(videoFile?.state || '').toUpperCase();
      if (state === 'ACTIVE') break;
      if (state === 'FAILED') throw new Error('Gemini failed while processing the video.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      videoFile = await ai.files.get({ name: videoFile.name });
    }

    const finalState = String(videoFile?.state || '').toUpperCase();
    if (finalState !== 'ACTIVE') throw new Error('Gemini video processing timed out.');
    if (!videoFile?.uri) throw new Error('Gemini returned no video URI.');

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
- Score moments from the actual visual evidence, not from guesses.

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
  "subject": {
    "motorcycleVisible": false,
    "riderVisible": false,
    "motorcycleModel": "",
    "description": ""
  },
  "shot": {
    "type": "",
    "cameraMovement": "",
    "cameraAngle": "",
    "stability": ""
  },
  "action": "",
  "visualQuality": {
    "composition": "",
    "lighting": "",
    "sharpness": "",
    "subjectVisibility": "",
    "cinematicPotential": ""
  },
  "cinematicScore": 0,
  "bestMoments": [
    {
      "start": 0,
      "end": 0,
      "description": "",
      "reason": "",
      "score": 0,
      "cinematicScore": 0,
      "actionScore": 0,
      "compositionScore": 0,
      "subjectVisibilityScore": 0,
      "cameraMovementScore": 0
    }
  ],
  "editingRecommendation": {
    "role": "",
    "suggestedDuration": 0,
    "speed": 1,
    "slowMotion": false,
    "reason": ""
  },
  "textRecommendation": {
    "useText": false,
    "text": "",
    "reason": ""
  },
  "transitionRecommendation": "",
  "motionRecommendation": "",
  "editorialNotes": ""
}

Moment scoring rules:
- All scores are 0–100 integers.
- score is the overall editorial strength of that exact moment.
- cinematicScore measures cinematic visual potential.
- actionScore measures genuine visible riding/action energy.
- compositionScore measures framing and visual composition.
- subjectVisibilityScore measures how clearly the motorcycle/rider is visible.
- cameraMovementScore measures useful real camera movement.
- Do not give high scores merely because a moment exists; use the actual footage.
- Return the strongest distinct moments first, but keep their timestamps accurate.
`;

    const model = process.env.GEMINI_ANALYSIS_MODEL || 'gemini-2.5-flash-lite';
    const response = await ai.models.generateContent({ model, contents: createUserContent([createPartFromUri(videoFile.uri, videoFile.mimeType || contentType), analysisPrompt]) });
    const modelText = String(response?.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    if (!modelText) throw new Error('Gemini returned no analysis.');

    let analysis;
    try { analysis = JSON.parse(modelText); }
    catch { throw new Error('Gemini returned invalid analysis JSON.'); }

    if (!Array.isArray(analysis.bestMoments)) analysis.bestMoments = [];
    analysis.bestMoments = analysis.bestMoments.filter((moment) => Number.isFinite(Number(moment?.start)) && Number.isFinite(Number(moment?.end)) && Number(moment.end) > Number(moment.start)).map((moment) => ({
      ...moment,
      score: Math.max(0, Math.min(100, Number(moment.score) || 0)),
      cinematicScore: Math.max(0, Math.min(100, Number(moment.cinematicScore) || 0)),
      actionScore: Math.max(0, Math.min(100, Number(moment.actionScore) || 0)),
      compositionScore: Math.max(0, Math.min(100, Number(moment.compositionScore) || 0)),
      subjectVisibilityScore: Math.max(0, Math.min(100, Number(moment.subjectVisibilityScore) || 0)),
      cameraMovementScore: Math.max(0, Math.min(100, Number(moment.cameraMovementScore) || 0)),
    }));

    console.log('[ANALYSE] Gemini analysis completed successfully.');
    return res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error('[ANALYSE] BIKEZTAGRAM VIDEO ANALYSIS ERROR', error);
    return res.status(500).json({ success: false, error: error?.message || 'Unknown video analysis error.' });
  }
}
