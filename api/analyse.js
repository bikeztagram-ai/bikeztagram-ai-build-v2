import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY is missing.'
      });
    }

    const {
      videoUrl = '',
      blobUrl = '',
      pathname = '',
      filename = 'video.mp4',
      mimeType = 'video/mp4',
      prompt = ''
    } = req.body || {};

    const actualVideoUrl = videoUrl || blobUrl;

    if (!actualVideoUrl) {
      return res.status(400).json({
        success: false,
        error: 'No public Blob video URL was supplied.'
      });
    }

    console.log('[ANALYSE] Public Blob video URL received.');
    console.log('[ANALYSE] Blob pathname:', pathname);
    console.log('[ANALYSE] Downloading video from Blob...');

    const blobResponse = await fetch(actualVideoUrl);

    if (!blobResponse.ok) {
      throw new Error(
        `Could not download the uploaded Blob video. HTTP ${blobResponse.status}`
      );
    }

    const contentType =
      blobResponse.headers.get('content-type') ||
      mimeType ||
      'video/mp4';

    const videoArrayBuffer = await blobResponse.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);

    if (!videoBuffer.length) {
      throw new Error('Downloaded Blob video was empty.');
    }

    console.log(
      '[ANALYSE] Video downloaded successfully:',
      videoBuffer.length,
      'bytes'
    );

    const ai = new GoogleGenAI({ apiKey });

    console.log('[ANALYSE] Uploading video to Gemini...');

    let videoFile = await ai.files.upload({
      file: new Blob([videoBuffer], { type: contentType }),
      config: {
        mimeType: contentType,
        displayName: filename
      }
    });

    if (!videoFile?.name) {
      throw new Error('Gemini did not return a valid uploaded file.');
    }

    console.log('[ANALYSE] Gemini file uploaded:', videoFile.name);

    for (let attempt = 0; attempt < 60; attempt++) {
      const state = String(videoFile?.state || '').toUpperCase();

      console.log(
        '[ANALYSE] Gemini processing state:',
        state,
        'attempt:',
        attempt + 1
      );

      if (state === 'ACTIVE') break;

      if (state === 'FAILED') {
        throw new Error('Gemini failed while processing the video.');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      videoFile = await ai.files.get({ name: videoFile.name });
    }

    const finalState = String(videoFile?.state || '').toUpperCase();

    if (finalState !== 'ACTIVE') {
      throw new Error('Gemini video processing timed out.');
    }

    if (!videoFile?.uri) {
      throw new Error('Gemini returned no video URI.');
    }

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
      "reason": ""
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
`;

    console.log('[ANALYSE] Sending actual video to Gemini generateContent...');

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: createUserContent([
        createPartFromUri(
          videoFile.uri,
          videoFile.mimeType || contentType
        ),
        analysisPrompt
      ]),
      config: {
        responseMimeType: 'application/json'
      }
    });

    let modelText = String(response?.text || '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    if (!modelText) {
      throw new Error('Gemini returned no analysis.');
    }

    let analysis;

    try {
      analysis = JSON.parse(modelText);
    } catch (parseError) {
      console.error('[ANALYSE] Gemini returned:', modelText);
      throw new Error('Gemini returned invalid analysis JSON.');
    }

    if (!Array.isArray(analysis?.bestMoments)) {
      analysis.bestMoments = [];
    }

    /*
     * =====================================================
     * STEP 9 — GEMINI FINAL EDIT DIRECTOR
     * =====================================================
     *
     * The first Gemini pass watches the real video.
     * This second pass does NOT watch the video again.
     * It works only from the verified moments returned above.
     *
     * The resulting selected moments are written back into
     * bestMoments so the existing client renderer/planner can
     * use the AI-directed order without changing the protected
     * renderer or Blob upload path.
     */

    console.log('[ANALYSE] Asking Gemini to build the final edit plan...');

    const directorPrompt = `
You are the final AI edit director for BIKEZTAGRAM AI.

A separate Gemini video-analysis stage has already watched the ACTUAL motorcycle footage and produced the verified analysis below.

Do NOT analyse the video again.
Do NOT invent footage, actions, camera angles, timestamps or events.
Use ONLY the supplied verified bestMoments.

USER CREATIVE REQUEST:
${prompt || 'Create an exciting cinematic motorcycle social-media edit.'}

VERIFIED VIDEO ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Create the strongest short social-media edit from the verified moments.
Prefer a story such as mystery -> build -> reveal -> action -> hero ending when the footage supports it.
Avoid repetitive moments.
Prefer the strongest verified moment as the ending.
Use fewer cuts if there are not enough strong verified moments.

Return ONLY valid JSON in exactly this structure:
{
  "title": "string",
  "style": "cinematic motorcycle trailer",
  "colorGrade": "dark-cinematic",
  "textOverlay": "",
  "cuts": [
    {
      "momentIndex": 0,
      "purpose": "opening",
      "startTime": 0,
      "endTime": 0,
      "duration": 2,
      "transition": "hard-cut",
      "motionStyle": "static",
      "speed": 1,
      "text": ""
    }
  ]
}

Rules:
- momentIndex MUST refer to an existing bestMoments item.
- startTime and endTime MUST remain inside that moment.
- duration must be 0.5 to 4 seconds.
- speed must be 0.5 to 1.5.
- Allowed transitions: hard-cut, fade-in, fade-out, dip-black, crossfade, flash-cut, whip-left, whip-right.
- Allowed motion styles: static, slow-push, slow-pull, pan-left, pan-right, tilt-up, tilt-down.
- Maximum 8 cuts.
- Prefer 3 to 6 cuts when enough strong moments exist.
- Do not duplicate a moment unless absolutely necessary.
- Keep text sparse.
`;

    const directorResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: directorPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    let directorText = String(directorResponse?.text || '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let editPlan = null;

    try {
      editPlan = JSON.parse(directorText);
    } catch (directorParseError) {
      console.warn('[ANALYSE] Final director returned invalid JSON. Keeping verified analysis.', directorText.slice(0, 1000));
    }

    const verifiedMoments = analysis.bestMoments;

    if (editPlan && Array.isArray(editPlan.cuts)) {
      const directedMoments = editPlan.cuts
        .map((cut) => {
          const index = Number(cut?.momentIndex);
          if (!Number.isInteger(index) || index < 0 || index >= verifiedMoments.length) {
            return null;
          }

          const source = verifiedMoments[index];
          const sourceStart = Number(source?.start);
          const sourceEnd = Number(source?.end);

          if (!Number.isFinite(sourceStart) || !Number.isFinite(sourceEnd) || sourceEnd <= sourceStart) {
            return null;
          }

          const requestedStart = Number(cut?.startTime);
          const requestedEnd = Number(cut?.endTime);
          const start = Number.isFinite(requestedStart)
            ? Math.max(sourceStart, Math.min(requestedStart, sourceEnd))
            : sourceStart;
          const end = Number.isFinite(requestedEnd)
            ? Math.max(start + 0.1, Math.min(requestedEnd, sourceEnd))
            : sourceEnd;

          return {
            ...source,
            start,
            end,
            description: source.description,
            reason: source.reason,
            purpose: String(cut?.purpose || 'cinematic'),
            transition: String(cut?.transition || 'hard-cut'),
            motionStyle: String(cut?.motionStyle || 'static'),
            speed: Math.max(0.5, Math.min(1.5, Number(cut?.speed) || 1)),
            text: String(cut?.text || '')
          };
        })
        .filter(Boolean)
        .slice(0, 8);

      if (directedMoments.length) {
        analysis.bestMoments = directedMoments;
        analysis.aiEditPlan = editPlan;
        analysis.aiEditPlanSource = 'gemini-final-director';
        console.log('[ANALYSE] Final Gemini edit plan accepted:', directedMoments.length, 'cuts');
      }
    }

    console.log('[ANALYSE] Gemini analysis and final edit direction completed successfully.');

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('========================================');
    console.error('[ANALYSE] BIKEZTAGRAM VIDEO ANALYSIS ERROR');
    console.error('Message:', error?.message || error);
    console.error('Stack:', error?.stack || 'No stack trace');
    console.error('========================================');

    return res.status(500).json({
      success: false,
      error: error?.message || 'Unknown video analysis error.'
    });
  }
}
