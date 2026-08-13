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

    console.log(
      'Analyse API key detected:',
      Boolean(apiKey),
      'length:',
      apiKey ? apiKey.length : 0
    );

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          'GEMINI_API_KEY is missing in Vercel settings.'
      });
    }

    const {
      videoBase64 = '',
      mimeType = 'video/mp4',
      filename = 'video.mp4'
    } = req.body || {};

    if (!videoBase64) {
      return res.status(400).json({
        success: false,
        error: 'No video was supplied.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey
    });

    /*
     * The browser sends the video as base64.
     * Convert it back into binary data for Gemini.
     */

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

    if (videoBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'The supplied video was empty.'
      });
    }

    /*
     * Upload the actual video to Gemini Files API.
     */

    let videoFile;

    try {
      videoFile = await ai.files.upload({
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
    } catch (error) {
      console.error(
        'Gemini file upload error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          `Gemini video upload failed: ${
            error?.message ||
            'Unknown upload error'
          }`
      });
    }

    console.log(
      'Gemini file:',
      videoFile?.name,
      videoFile?.uri,
      videoFile?.mimeType,
      videoFile?.state
    );

    if (!videoFile?.name) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini did not return a valid uploaded file.'
      });
    }

    /*
     * Wait for Gemini to finish processing the video.
     */

    let currentFile = videoFile;

    for (
      let attempt = 0;
      attempt < 30;
      attempt++
    ) {
      const state =
        String(
          currentFile?.state ||
          ''
        ).toUpperCase();

      console.log(
        'Gemini video processing state:',
        state || 'UNKNOWN',
        'attempt:',
        attempt + 1
      );

      if (
        state === 'ACTIVE'
      ) {
        break;
      }

      if (
        state === 'FAILED'
      ) {
        return res.status(500).json({
          success: false,
          error:
            'Gemini failed while processing the video.'
        });
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
        currentFile?.state ||
        ''
      ).toUpperCase();

    if (
      finalState !==
      'ACTIVE'
    ) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini video processing timed out.'
      });
    }

    if (
      !currentFile?.uri
    ) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini processed the video but returned no file URI.'
      });
    }

    console.log(
      'Gemini video ready:',
      currentFile.uri
    );

    /*
     * This is the important part.
     *
     * Gemini is now receiving the ACTUAL VIDEO,
     * not just the filename and file size.
     */

    const analysisPrompt = `
You are the AI Director for BIKEZTAGRAM AI.

You are an elite professional motorcycle film editor,
cinematographer and social-media trailer director.

You have been given the ACTUAL VIDEO FILE.

WATCH AND ANALYSE THE VIDEO ITSELF.

Do NOT rely on the filename.

Do NOT invent anything that is not visible or audible.

Your job is to determine exactly how useful this footage
would be inside a professional cinematic motorcycle reel.

Analyse:

1. SUBJECT

Identify:

- motorcycle visibility
- motorcycle model if recognisable
- rider visibility
- scenery
- other important subjects
- whether the motorcycle is the clear focus

2. SHOT TYPE

Identify the strongest description:

- wide
- medium
- close-up
- detail
- riding
- tracking
- follow shot
- stationary
- reveal
- action
- scenery
- other

3. CAMERA

Analyse:

- camera movement
- camera direction
- camera angle
- stability
- whether the camera follows the motorcycle
- whether the shot is handheld, mounted or stationary
- whether
