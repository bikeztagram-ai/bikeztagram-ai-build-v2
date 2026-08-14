import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    /*
     * =====================================================
     * STEP 0 — CHECK GEMINI
     * =====================================================
     */

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY is missing.'
      });
    }

    /*
     * =====================================================
     * STEP 1 — READ REQUEST
     * =====================================================
     *
     * Current App.jsx sends:
     *
     * videoUrl: blob.url
     *
     * We also accept blobUrl for compatibility.
     */

    const {
      videoUrl = '',
      blobUrl = '',
      pathname = '',
      filename = 'video.mp4',
      mimeType = 'video/mp4',
      prompt = ''
    } = req.body || {};

    const actualVideoUrl =
      videoUrl ||
      blobUrl;

    if (!actualVideoUrl) {
      return res.status(400).json({
        success: false,
        error:
          'No public Blob video URL was supplied.'
      });
    }

    console.log(
      '[ANALYSE] Public Blob video URL received.'
    );

    console.log(
      '[ANALYSE] Blob pathname:',
      pathname
    );

    console.log(
      '[ANALYSE] Filename:',
      filename
    );

    /*
     * =====================================================
     * STEP 2 — DOWNLOAD PUBLIC BLOB VIDEO
     * =====================================================
     *
     * The new bikeztagram-media-live store is PUBLIC.
     *
     * Therefore the Blob URL can be fetched directly.
     *
     * This deliberately avoids using @vercel/blob get()
     * and avoids mixing credentials from the old stores.
     */

    console.log(
      '[ANALYSE] Downloading video from public Blob URL...'
    );

    const blobResponse =
      await fetch(actualVideoUrl);

    if (!blobResponse.ok) {
      throw new Error(
        `Could not download the uploaded Blob video. HTTP ${blobResponse.status}`
      );
    }

    const contentType =
      blobResponse.headers.get(
        'content-type'
      ) ||
      mimeType ||
      'video/mp4';

    const videoArrayBuffer =
      await blobResponse.arrayBuffer();

    const videoBuffer =
      Buffer.from(videoArrayBuffer);

    if (!videoBuffer.length) {
      throw new Error(
        'Downloaded Blob video was empty.'
      );
    }

    console.log(
      '[ANALYSE] Video downloaded successfully:',
      videoBuffer.length,
      'bytes'
    );

    /*
     * =====================================================
     * STEP 3 — INITIALISE GEMINI
     * =====================================================
     */

    const ai =
      new GoogleGenAI({
        apiKey
      });

    /*
     * =====================================================
     * STEP 4 — UPLOAD VIDEO TO GEMINI
     * =====================================================
     */

    console.log(
      '[ANALYSE] Uploading video to Gemini...'
    );

    const videoFile =
      await ai.files.upload({
        file: new Blob(
          [videoBuffer],
          {
            type: contentType
          }
        ),
        config: {
          mimeType: contentType,
          displayName: filename
        }
      });

    if (!videoFile?.name) {
      throw new Error(
        'Gemini did not return a valid uploaded file.'
      );
    }

    console.log(
      '[ANALYSE] Gemini file uploaded:',
      videoFile.name
    );

    /*
     * =====================================================
     * STEP 5 — WAIT FOR GEMINI VIDEO PROCESSING
     * =====================================================
     */

    let currentFile =
      videoFile;

    let videoReady =
      false;

    for (
      let attempt = 0;
      attempt < 60;
      attempt++
    ) {
      const state =
        String(
          currentFile?.state ||
            ''
        ).toUpperCase();

      console.log(
        '[ANALYSE] Gemini processing state:',
        state,
        'attempt:',
        attempt + 1
      );

      if (
        state ===
        'ACTIVE'
      ) {
        videoReady =
          true;

        break;
      }

      if (
        state ===
        'FAILED'
      ) {
        throw new Error(
          'Gemini failed while processing the video.'
        );
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            2000
          )
      );

      currentFile =
        await ai.files.get({
          name:
            videoFile.name
        });
    }

    if (!videoReady) {
      throw new Error(
        'Gemini video processing timed out.'
      );
    }

    if (!currentFile?.uri) {
      throw new Error(
        'Gemini returned no video URI.'
      );
    }

    console.log(
      '[ANALYSE] Video is ready for Gemini analysis.'
    );

    /*
     * =====================================================
     * STEP 6 — BUILD AI ANALYSIS PROMPT
     * =====================================================
     */

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

    /*
     * =====================================================
     * STEP 7 — SEND ACTUAL VIDEO TO GEMINI
     * =====================================================
     */

    console.log(
      '[ANALYSE] Sending actual video to Gemini...'
    );

    const interaction =
      await ai.interactions.create({
        model:
          'gemini-3.6-flash',

        input: [
          {
            type: 'video',
            uri:
              currentFile.uri,
            mime_type:
              currentFile.mimeType ||
              contentType
          },
          {
            type: 'text',
            text:
              analysisPrompt
          }
        ]
      });

    /*
     * =====================================================
     * STEP 8 — EXTRACT GEMINI RESPONSE
     * =====================================================
     */

    let modelText =
      interaction?.output_text ||
      '';

    if (
      !modelText &&
      Array.isArray(
        interaction?.outputs
      )
    ) {
      for (
        const output of
        interaction.outputs
      ) {
        if (
          Array.isArray(
            output?.content
          )
        ) {
          for (
            const part of
            output.content
          ) {
            if (
              typeof part?.text ===
              'string'
            ) {
              modelText +=
                part.text;
            }
          }
        }
      }
    }

    modelText =
      String(modelText)
        .replace(
          /```json/gi,
          ''
        )
        .replace(
          /```/g,
          ''
        )
        .trim();

    if (!modelText) {
      throw new Error(
        'Gemini returned no analysis.'
      );
    }

    /*
     * =====================================================
     * STEP 9 — PARSE JSON
     * =====================================================
     */

    let analysis;

    try {
      analysis =
        JSON.parse(
          modelText
        );
    } catch {
      console.error(
        '[ANALYSE] Gemini raw response:',
        modelText
      );

      throw new Error(
        'Gemini returned invalid analysis JSON.'
      );
    }

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    console.log(
      '[ANALYSE] Gemini analysis completed successfully.'
    );

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error(
      '========================================'
    );

    console.error(
      '[ANALYSE] BIKEZTAGRAM VIDEO ANALYSIS ERROR'
    );

    console.error(
      'Message:',
      error?.message ||
        error
    );

    console.error(
      'Stack:',
      error?.stack ||
        'No stack trace'
    );

    console.error(
      '========================================'
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        'Unknown video analysis error.'
    });
  }
      }
