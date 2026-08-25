export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      prompt = '',
      media = []
    } = req.body || {};

    const apiKey =
      process.env.GEMINI_API_KEY;

    console.log(
      'Gemini key detected:',
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

    if (
      !Array.isArray(media) ||
      media.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          'No media was supplied.'
      });
    }

    const mediaList = media
      .map((item, index) => {
        return `
MEDIA ${index}
filename: ${item.name || 'unknown'}
type: ${item.type || 'unknown'}
size: ${item.size || 0} bytes
`;
      })
      .join('\n');

    const directorPrompt = `
You are an elite professional film editor and motorcycle
commercial director.

You are creating a cinematic social-media motorcycle trailer.

USER'S CREATIVE REQUEST:

${prompt || 'Create an epic cinematic motorcycle trailer.'}

UPLOADED MEDIA:

${mediaList}

Your job is NOT to simply place the media in upload order.

Instead, act as an intelligent editor.

==================================================
1. SORT THE FOOTAGE
==================================================

Determine the best possible order for the available media.

Consider:

- visual impact
- motorcycle visibility
- camera angle
- action
- movement
- composition
- variety
- continuity
- story progression
- reveal potential
- energy
- suitability for opening
- suitability for ending

Do not assume the upload order is correct.

==================================================
2. BUILD A STORY
==================================================

Whenever the footage allows, structure the edit like this:

ACT 1 — MYSTERY
Short intriguing shots.

ACT 2 — ANTICIPATION
Details, movement and preparation.

ACT 3 — REVEAL
Show the motorcycle properly.

ACT 4 — ESCALATION
Increase pace and energy.

ACT 5 — ACTION
Use the strongest riding/movement footage.

ACT 6 — HERO ENDING
Finish with the strongest visual.

The structure may change if the footage suggests
a better story.

==================================================
3. CHOOSE THE BEST CLIPS
==================================================

You do NOT have to use every media item.

If several clips are repetitive, use the strongest one.

Do not include weak footage simply because it exists.

However, do not discard a clip unless there is a
reasonable editorial reason.

==================================================
4. SHOT LENGTH
==================================================

Use shorter shots for:

- action
- acceleration
- fast movement
- transitions
- build-up

Use longer shots for:

- hero shots
- motorcycle reveals
- beautiful scenery
- important cinematic moments

Normal shot duration:

0.5–3 seconds.

A particularly strong hero shot may be longer.

==================================================
5. TRANSITIONS
==================================================

Use transitions purposefully to enhance the cinematic flow.

Available transitions:

hard-cut
fade-in
fade-out
dip-black
crossfade
flash-cut
whip-left
whip-right
zoom-punch
light-leak-left
light-leak-right

Do NOT use the same transition repeatedly. 

Most action cuts should be hard cuts or whip pans.
Use light leaks for dramatic mood shifts.
Use zoom-punch for high-energy impacts.

==================================================
6. CAMERA MOTION & FRAMING
==================================================

Use purposeful motion to improve the narrative.

Available styles:

static
slow-push
slow-pull
pan-left
pan-right
tilt-up
tilt-down
orbit

Only use motion when it improves the shot.
Use "orbit" for hero shots of the motorcycle.
Ensure reframing focuses on the motorcycle or the main action.

==================================================
7. SPEED
==================================================

Use a speed value between 0.5 and 1.5.

Slow motion (0.5–0.8) for:
- hero shots
- reveals
- dramatic, atmospheric moments

Faster playback (1.2–1.5) for:
- intense action
- acceleration
- dynamic transitions

==================================================
8. TEXT
==================================================

Keep text minimal and cinematic. 

Do not put text on every shot.
Use text only when it enhances the brand or context.

Available text:
NINJA 1000SX
KAWASAKI
BIKEZTAGRAM
(or empty for no text)

==================================================
9. EDITING PRINCIPLES
==================================================

Avoid:

- repetitive shots
- random ordering
- unnecessary transitions
- excessive text
- constant zooming
- boring openings
- weak endings

Prioritise:

- rhythm
- contrast
- anticipation
- payoff
- movement
- visual variety
- cinematic pacing

==================================================
10. IMPORTANT LIMITATION
==================================================

You only know the metadata and filenames of the media.

DO NOT pretend you can see footage that has not been provided.

Use filenames as clues but do not invent events.

==================================================

Return ONLY valid JSON.

Use exactly this structure:

{
  "title": "string",
  "style": "cinematic motorcycle trailer",
  "colorGrade": "dark-cinematic",
  "textOverlay": "NINJA 1000SX",
  "cuts": [
    {
      "mediaIndex": 0,
      "duration": 2,
      "purpose": "mystery",
      "transition": "fade-in",
      "motionStyle": "slow-push",
      "speed": 1,
      "text": ""
    }
  ]
}

IMPORTANT:

mediaIndex refers to the MEDIA number above.

Do not create mediaIndex values that don't exist.

The cuts array represents the FINAL EDIT ORDER.

The order of cuts is the order the finished video
should play.

Do not simply return MEDIA 0, MEDIA 1, MEDIA 2 etc.

Actually rearrange them based on the best cinematic story.
`;

    /*
     * Gemini 3.5 Flash
     *
     * Use the current model ID and Google's
     * X-goog-api-key authentication header.
     */
    const geminiResponse =
      await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            'X-goog-api-key':
              apiKey
          },

          body: JSON.stringify({
            contents: [
              {
                role: 'user',

                parts: [
                  {
                    text: directorPrompt
                  }
                ]
              }
            ],

            generationConfig: {
              responseMimeType:
                'application/json'
            }
          })
        }
      );

    const responseText =
      await geminiResponse.text();

    console.log(
      'Gemini HTTP status:',
      geminiResponse.status
    );

    if (!geminiResponse.ok) {
      console.error(
        'Gemini API error:',
        responseText.slice(0, 2000)
      );

      return res.status(500).json({
        success: false,
        error:
          `Gemini error ${geminiResponse.status}: ` +
          responseText.slice(0, 500)
      });
    }

    let geminiData;

    try {
      geminiData =
        JSON.parse(responseText);
    } catch {
      console.error(
        'Gemini returned invalid response JSON:',
        responseText.slice(0, 2000)
      );

      return res.status(500).json({
        success: false,
        error:
          'Gemini returned invalid JSON.'
      });
    }

    let modelText =
      geminiData
        ?.candidates?.[0]
        ?.content?.parts?.find(
          (part) =>
            typeof part.text ===
            'string'
        )
        ?.text || '';

    modelText =
      modelText
        .replace(
          /```json/gi,
          ''
        )
        .replace(
          /```/g,
          ''
        )
        .trim();

    let plan;

    try {
      plan =
        JSON.parse(modelText);
    } catch {
      console.error(
        'Invalid edit plan:',
        modelText.slice(0, 2000)
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
          'Gemini did not create any usable cuts.'
      });
    }

    /*
     * Validate every media index.
     */
    plan.cuts =
      plan.cuts
        .filter((cut) => {
          const index =
            Number(
              cut.mediaIndex
            );

          return (
            Number.isInteger(index) &&
            index >= 0 &&
            index < media.length
          );
        })
        .map((cut) => {
          const duration =
            Number(
              cut.duration
            );

          const speed =
            Number(
              cut.speed
            );

          return {
            mediaIndex:
              Number(
                cut.mediaIndex
              ),

            mediaId:
              Number(
                cut.mediaIndex
              ),

            duration:
              Math.max(
                0.5,
                Math.min(
                  5,
                  Number.isFinite(
                    duration
                  )
                    ? duration
                    : 2
                )
              ),

            purpose:
              String(
                cut.purpose ||
                  'cinematic'
              ),

            transition:
              String(
                cut.transition ||
                  'hard-cut'
              ),

            motionStyle:
              String(
                cut.motionStyle ||
                  'static'
              ),

            speed:
              Math.max(
                0.5,
                Math.min(
                  1.5,
                  Number.isFinite(
                    speed
                  )
                    ? speed
                    : 1
                )
              ),

            text:
              String(
                cut.text || ''
              )
          };
        });

    if (plan.cuts.length === 0) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini returned no valid media cuts.'
      });
    }

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
