import { get } from '@vercel/blob';
import { GoogleGenAI } from '@google/genai';

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
      pathname = '',
      filename = 'video.mp4',
      mimeType = 'video/mp4',
      prompt = ''
    } = req.body || {};

    if (!pathname) {
      return res.status(400).json({
        success: false,
        error: 'No Blob pathname was supplied.'
      });
    }

    console.log(
      '[ANALYSE] Retrieving private Blob:',
      pathname
    );

    /*
     * Private Blob files cannot be fetched directly
     * from their blob URL.
     *
     * The Vercel Function authenticates with OIDC
     * automatically and retrieves the file through
     * the Blob SDK.
     */
    const blobResult = await get(
      pathname,
      {
        access: 'private'
      }
    );

    if (!blobResult) {
      throw new Error(
        'The requested video was not found in Blob storage.'
      );
    }

    if (blobResult.statusCode !== 200) {
      throw new Error(
        `Could not retrieve video from Blob. HTTP ${blobResult.statusCode}`
      );
    }

    if (!blobResult.stream) {
      throw new Error(
        'Blob returned no video stream.'
      );
    }

    console.log(
      '[ANALYSE] Private Blob retrieved successfully.'
    );

    /*
     * Convert the Blob stream into a Buffer.
     */
    const chunks = [];

    for await (
      const chunk of blobResult.stream
    ) {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk)
      );
    }

    const videoBuffer =
      Buffer.concat(chunks);

    if (!videoBuffer.length) {
      throw new Error(
        'Downloaded video was empty.'
      );
    }

    console.log(
      '[ANALYSE] Video downloaded:',
      videoBuffer.length,
      'bytes'
    );

    const ai =
      new GoogleGenAI({
        apiKey
      });

    console.log(
      '[ANALYSE] Uploading video to Gemini...'
    );

    const videoFile =
      await ai.files.upload({
        file: new Blob(
          [videoBuffer],
          {
            type: mimeType
          }
        ),
        config: {
          mimeType,
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

    let currentFile =
      videoFile;

    /*
     * Wait for Gemini to finish processing
     * the uploaded video.
     */
    for (
      let attempt = 0;
      attempt < 30;
      attempt++
    ) {
      const state =
        String(
          currentFile?.state || ''
        ).toUpperCase();

      console.log(
        '[ANALYSE] Gemini processing:',
        state,
        'attempt:',
        attempt + 1
      );

      if (state === 'ACTIVE') {
        break;
      }

      if (state === 'FAILED') {
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

    const finalState =
      String(
        currentFile?.state || ''
      ).toUpperCase();

    if (
      finalState !==
      'ACTIVE'
    ) {
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
      '[ANALYSE] Video ready for Gemini analysis.'
    );

    const analysisPrompt = `
You are the AI Director for BIKEZTAGRAM AI.

Analyse the ACTUAL motorcycle video supplied to you.

Do not rely on the filename.
Do not invent anything that is not visible.

Analyse:

1. Motorcycle and rider visibility
2. Motorcycle model if recognisable
3. Shot type
4. Camera movement
5. Camera angle
6. Stability
7. What actually happens in the footage
8. Acceleration, cornering, passing and riding
9. Composition
10. Lighting
11. Sharpness
12. Subject visibility
13. Cinematic potential
14. Best moments and timestamps
15. Best editing role
16. Suggested duration
17. Suggested playback speed
18. Whether slow motion would help
19. Text recommendation
20. Transition recommendation
21. Camera-motion recommendation

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
              mimeType
          },
          {
            type: 'text',
            text:
              analysisPrompt
          }
        ]
      });

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

    let analysis;

    try {
      analysis =
        JSON.parse(
          modelText
        );
    } catch {
      throw new Error(
        'Gemini returned invalid analysis JSON.'
      );
    }

    console.log(
      '[ANALYSE] Gemini analysis completed successfully.'
    );

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error(
      '[ANALYSE] Video analysis error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        'Unknown video analysis error.'
    });
  }
}
