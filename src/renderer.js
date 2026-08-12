export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      prompt,
      media = [],
      visuals = []
    } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          'GEMINI_API_KEY is missing in Vercel settings.'
      });
    }

    if (!Array.isArray(media) || media.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No media information was supplied.'
      });
    }

    const mediaDescription = media
      .map((item) => {
        return [
          `MEDIA ${item.id}`,
          `filename: ${item.name || 'unknown'}`,
          `type: ${item.type || 'unknown'}`,
          `size: ${item.size || 0} bytes`
        ].join('\n');
      })
      .join('\n\n');

    const systemPrompt = `
You are the senior editor and creative director for a professional
cinematic motorcycle production.

You are editing the user's actual uploaded motorcycle footage and photos.

IMPORTANT:
You will receive representative frames extracted from the user's actual
media. STUDY THE FRAMES carefully before making editing decisions.

Do not simply use the files in numerical order.

Identify:
- motorcycle hero shots
- close-up/detail shots
- riding shots
- moving shots
- road/scenery shots
- front/rear/side angles
- wheel shots
- rider shots
- dramatic reveal opportunities
- visually weak or repetitive material

Create a genuinely edited sequence.

The user's creative request is:

${prompt || 'Create an epic cinematic motorcycle trailer.'}

AVAILABLE MEDIA:

${mediaDescription}

Return ONLY valid JSON.

Use this exact structure:

{
  "title": "string",
  "style": "string",
  "colorGrade": "dark-cinematic",
  "textOverlay": "string",
  "cuts": [
    {
      "mediaIndex": 0,
      "startTime": 0,
      "endTime": 2,
      "duration": 2,
      "purpose": "mystery",
      "transition": "fade-in",
      "motionStyle": "slow-push",
      "speed": 1,
      "text": ""
    }
  ]
}

EDITING RULES:

1. Do NOT simply stitch every file together in upload order.

2. Choose the strongest visual material first.

3. Repetition should be avoided.

4. Build a story:
   - mystery/opening
   - anticipation
   - reveal
   - action
   - hero ending

5. Use short shots when energy should increase.

6. Use longer shots for important hero moments.

7. Use approximately 0.5–3.0 seconds per shot unless a longer hero shot
   is genuinely justified.

8. For videos, use startTime and endTime to select the strongest section
   of the clip.

9. Do not invent moments that are not visible in the supplied frames.

10. Use different transition types intelligently:
    - hard-cut
    - fade-in
    - fade-out
    - crossfade
    - dip-black
    - flash-cut
    - whip-left
    - whip-right

11. Use different motion styles intelligently:
    - static
    - slow-push
    - slow-pull
    - pan-left
    - pan-right
    - tilt-up
    - tilt-down

12. Speed should normally be between 0.5 and 1.5.

13. Do not use text on every shot.

14. Text should be minimal and cinematic.

15. The final shot should normally be one of the strongest motorcycle
    hero shots.

16. The final result should feel like a professional motorcycle
    advertising trailer rather than a slideshow.

17. If the user requests an aggressive edit, increase cutting speed.

18. If the user requests a cinematic edit, use controlled pacing and
    longer hero shots.

19. If the user requests a social-media edit, favour a strong first
    second and visually powerful early shots.

20. Only reference mediaIndex values that actually exist.
`;

    const parts = [
      {
        text: systemPrompt
      }
    ];

    /*
     * Add the representative visual frames to Gemini.
     */
    for (const visual of visuals) {
      if (!visual || !Array.isArray(visual.frames)) {
        continue;
      }

      parts.push({
        text:
          `\nVISUAL ANALYSIS FOR MEDIA ${visual.mediaIndex}:\n` +
          `These are representative frames from ${visual.name || 'the media file'}.\n`
      });

      for (const frame of visual.frames) {
        if (!frame || !frame.data) {
          continue;
        }

        parts.push({
          inline_data: {
            mime_type: frame.mimeType || 'image/jpeg',
            data: frame.data
          }
        });

        parts.push({
          text:
            `Frame timestamp: ${
              Number(frame.time || 0).toFixed(2)
            } seconds`
        });
      }
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts
            }
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const responseText =
      await geminiResponse.text();

    if (!geminiResponse.ok) {
      console.error(
        'Gemini API error:',
        responseText
      );

      return res.status(500).json({
        success: false,
        error:
          `Gemini Error ${geminiResponse.status}: ` +
          responseText.slice(0, 500)
      });
    }

    let geminiData;

    try {
      geminiData =
        JSON.parse(responseText);
    } catch {
      return res.status(500).json({
        success: false,
        error:
          'Gemini returned an invalid API response.'
      });
    }

    let modelText =
      geminiData
        ?.candidates?.[0]
        ?.content?.parts?.find(
          (part) => part.text
        )
        ?.text || '';

    modelText = modelText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let plan;

    try {
      plan = JSON.parse(modelText);
    } catch (error) {
      console.error(
        'Invalid edit-plan JSON:',
        modelText
      );

      return res.status(500).json({
        success: false,
        error:
          'Gemini created an invalid edit plan.'
      });
    }

    if (
      !plan ||
      !Array.isArray(plan.cuts) ||
      plan.cuts.length === 0
    ) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini did not create any usable video cuts.'
      });
    }

    /*
     * Safety validation.
     */
    plan.cuts = plan.cuts
      .filter((cut) => {
        const index =
          Number(cut.mediaIndex);

        return (
          Number.isInteger(index) &&
          index >= 0 &&
          index < media.length
        );
      })
      .map((cut) => ({
        mediaIndex:
          Number(cut.mediaIndex),

        mediaId:
          Number(cut.mediaIndex),

        startTime:
          Math.max(
            0,
            Number(cut.startTime) || 0
          ),

        endTime:
          Math.max(
            0,
            Number(cut.endTime) || 0
          ),

        duration:
          Math.max(
            0.5,
            Math.min(
              5,
              Number(cut.duration) || 2
            )
          ),

        purpose:
          String(
            cut.purpose || 'cinematic'
          ),

        transition:
          String(
            cut.transition || 'hard-cut'
          ),

        motionStyle:
          String(
            cut.motionStyle || 'static'
          ),

        speed:
          Math.max(
            0.5,
            Math.min(
              1.5,
              Number(cut.speed) || 1
            )
          ),

        text:
          String(cut.text || '')
      }));

    return res.status(200).json({
      success: true,
      plan
    });
  } catch (error) {
    console.error(
      'Render API error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        'Unknown server error.'
    });
  }
}
