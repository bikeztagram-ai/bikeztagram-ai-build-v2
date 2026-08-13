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

    const videoBuffer = Buffer.from(
      videoBase64,
      'base64'
    );

    console.log(
      'Video received:',
      filename,
      'bytes:',
      videoBuffer.length,
      'mime:',
      mimeType
    );

    if (!videoBuffer.length) {
      return res.status(400).json({
        success: false,
        error: 'The supplied video was empty.'
      });
    }

    /*
     * Gemini supports inline video data for short videos.
     *
     * This avoids the separate Gemini Files API and
     * therefore avoids the file-reference permission problem
     * we were seeing.
     */

    const ai = new GoogleGenAI({
      apiKey
    });

    const analysisPrompt = `
You are the AI Director for BIKEZTAGRAM AI.

You are an elite professional motorcycle film editor,
cinematographer and social-media trailer director.

WATCH AND ANALYSE THE ACTUAL VIDEO.

Do NOT rely on the filename.

Do NOT invent anything that is not actually visible.

${prompt || 'Analyse this motorcycle footage for the strongest cinematic moments and editing opportunities.'}

Analyse:

1. Motorcycle visibility.
2. Rider visibility.
3. Motorcycle model if recognisable.
4. What actually happens in the video.
5. Camera angle.
6. Camera movement.
7. Camera stability.
8. Composition.
9. Lighting.
10. Sharpness and image quality.
11. Strongest cinematic moments.
12. Approximate timestamps for those moments.
13. Best use of the footage in a motorcycle trailer.
14. Recommended duration.
15. Recommended playback speed.
16. Whether slow motion would help.
17. Whether the footage should be an opening,
    reveal, action shot, transition or ending.
18. Whether there is text visible on screen.
19. Whether anything repeats unnecessarily.

Give the footage a cinematic score from 1 to 10.

Do not pretend to see anything that is not present.

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
  "transitionRecommendation": "hard-cut",
  "motionRecommendation": "static",
  "editorialNotes": ""
}
`;

    console.log(
      'Sending inline video directly to Gemini...'
    );

    const interaction =
      await ai.interactions.create({
        model: 'gemini-3.6-flash',

        input: [
          {
            type: 'video',

            data: videoBase64,

            mime_type: mimeType
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
      'Gemini analysis:',
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
        error: 'Gemini returned invalid analysis JSON.',
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
