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
        error: 'GEMINI_API_KEY is missing in Vercel settings.'
      });
    }

    const {
      videoBase64 = '',
      mimeType = 'video/mp4',
      filename = 'video.mp4',
      prompt = ''
    } = req.body || {};

    if (!videoBase64) {
      return res.status(400).json({
        success: false,
        error: 'No video was supplied.'
      });
    }

    console.log(
      'Receiving video:',
      filename,
      mimeType
    );

    const videoBuffer = Buffer.from(
      videoBase64,
      'base64'
    );

    console.log(
      'Video bytes:',
      videoBuffer.length
    );

    if (!videoBuffer.length) {
      return res.status(400).json({
        success: false,
        error: 'The supplied video was empty.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey
    });

    /*
     * Upload the actual video to Gemini Files API.
     */

    console.log('Uploading video to Gemini...');

    const uploadedFile = await ai.files.upload({
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

    console.log(
      'Gemini upload:',
      uploadedFile?.name,
      uploadedFile?.uri,
      uploadedFile?.state
    );

    if (!uploadedFile?.name) {
      throw new Error(
        'Gemini did not return a file name after upload.'
      );
    }

    /*
     * Wait until Gemini has finished processing
     * the uploaded video.
     */

    let videoFile = uploadedFile;

    for (let attempt = 1; attempt <= 30; attempt++) {
      const state =
        typeof videoFile.state === 'string'
          ? videoFile.state
          : videoFile.state?.name || '';

      console.log(
        `Gemini processing state: ${state || 'UNKNOWN'} (${attempt}/30)`
      );

      if (state === 'ACTIVE') {
        break;
      }

      if (state === 'FAILED') {
        throw new Error(
          'Gemini failed while processing the video.'
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 3000)
      );

      videoFile = await ai.files.get({
        name: uploadedFile.name
      });
    }

    const finalState =
      typeof videoFile.state === 'string'
        ? videoFile.state
        : videoFile.state?.name || '';

    console.log(
      'Final Gemini file state:',
      finalState
    );

    if (finalState !== 'ACTIVE') {
      throw new Error(
        'Gemini video processing timed out.'
      );
    }

    if (!videoFile.uri) {
      throw new Error(
        'Gemini processed the video but returned no URI.'
      );
    }

    console.log(
      'Video is ready:',
      videoFile.uri
    );

    /*
     * Ask Gemini to analyse the ACTUAL VIDEO.
     */

    const analysisPrompt = `
You are the AI Director for BIKEZTAGRAM AI.

You are an elite professional motorcycle film editor,
cinematographer and social-media trailer director.

WATCH AND ANALYSE THE ACTUAL VIDEO FILE.

Do not rely on the filename.

Do not invent anything that is not actually visible.

${prompt || 'Analyse this motorcycle footage for the strongest cinematic moments and editing opportunities.'}

Analyse:

1. What is actually visible in the footage.
2. Motorcycle visibility and identifiable model.
3. Rider visibility.
4. Camera angle and camera movement.
5. What action actually occurs.
6. Composition and framing.
7. Lighting and image quality.
8. Strongest cinematic moments.
9. Approximate timestamps for those moments.
10. Whether the footage would work best as an opening,
    reveal, action shot, transition or ending.
11. Recommended speed.
12. Recommended duration.
13. Whether slow motion would improve it.
14. Whether camera movement should be added.
15. Whether text should be used.
16. Whether there are repetitive moments or unwanted
    on-screen text.

Do not pretend to see anything that is not present.

Give the footage a cinematic score from 1 to 10.

Return ONLY valid JSON.

Use this structure:

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
  "transitionRecommendation": "hard-cut",
  "motionRecommendation": "static",
  "editorialNotes": ""
}
`;

    console.log(
      'Sending actual video to Gemini...'
    );

    const interaction =
      await ai.interactions.create({
        model: 'gemini-3.6-flash',

        input: [
          {
            type: 'video',
            uri: videoFile.uri,
            mime_type:
              videoFile.mimeType ||
              mimeType
          },
          {
            type: 'text',
            text: analysisPrompt
          }
        ]
      });

    console.log(
      'Gemini interaction completed:',
      interaction?.id || 'unknown'
    );

    let modelText =
      interaction?.output_text || '';

    /*
     * Fallback extraction in case output_text
     * isn't populated.
     */

    if (
      !modelText &&
      Array.isArray(interaction?.outputs)
    ) {
      for (const output of interaction.outputs) {
        if (!Array.isArray(output?.content)) {
          continue;
        }

        for (const part of output.content) {
          if (typeof part?.text === 'string') {
            modelText += part.text;
          }
        }
      }
    }

    modelText = String(modelText)
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    if (!modelText) {
      throw new Error(
        'Gemini returned no video analysis.'
      );
    }

    console.log(
      'Gemini response:',
      modelText.slice(0, 3000)
    );

    let analysis;

    try {
      analysis = JSON.parse(modelText);
    } catch (error) {
      console.error(
        'Gemini JSON parsing error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Gemini returned invalid analysis JSON.',
        raw: modelText.slice(0, 1500)
      });
    }

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error(
      'Video analysis error:',
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
