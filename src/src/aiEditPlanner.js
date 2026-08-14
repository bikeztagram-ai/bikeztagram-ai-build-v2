/*
 * BIKEZTAGRAM AI
 * AI Edit Plan Builder
 *
 * Converts Gemini's actual video analysis into the
 * plan.cuts structure already understood by renderer.js.
 *
 * IMPORTANT:
 * This file does NOT call Gemini.
 * Gemini analysis has already happened in /api/analyse.
 */

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function numberOr(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function cleanText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value).trim();
}

function chooseMotionStyle(
  cameraMovement,
  analysis
) {
  const movement =
    cleanText(cameraMovement)
      .toLowerCase();

  const recommendation =
    cleanText(
      analysis?.motionRecommendation
    ).toLowerCase();

  const combined =
    `${movement} ${recommendation}`;

  if (
    combined.includes('pan left') ||
    combined.includes('panning left')
  ) {
    return 'pan-left';
  }

  if (
    combined.includes('pan right') ||
    combined.includes('panning right')
  ) {
    return 'pan-right';
  }

  if (
    combined.includes('push') ||
    combined.includes('zoom in') ||
    combined.includes('zoom-in') ||
    combined.includes('move closer')
  ) {
    return 'slow-push';
  }

  if (
    combined.includes('pull') ||
    combined.includes('zoom out') ||
    combined.includes('zoom-out') ||
    combined.includes('move away')
  ) {
    return 'slow-pull';
  }

  if (
    combined.includes('tilt up') ||
    combined.includes('tilting up')
  ) {
    return 'tilt-up';
  }

  if (
    combined.includes('tilt down') ||
    combined.includes('tilting down')
  ) {
    return 'tilt-down';
  }

  /*
   * If Gemini says the camera is already panning,
   * use a gentle cinematic push rather than inventing
   * a completely different camera movement.
   */
  if (
    combined.includes('pan') ||
    combined.includes('orbit')
  ) {
    return 'slow-push';
  }

  return 'static';
}

function chooseTransition(
  transitionRecommendation,
  isFirstCut
) {
  if (isFirstCut) {
    return 'fade-in';
  }

  const value =
    cleanText(
      transitionRecommendation
    ).toLowerCase();

  if (
    value.includes('crossfade') ||
    value.includes('cross fade') ||
    value.includes('fade')
  ) {
    return 'fade';
  }

  if (
    value.includes('flash')
  ) {
    return 'flash-cut';
  }

  if (
    value.includes('dip')
  ) {
    return 'dip-black';
  }

  return 'hard-cut';
}

function buildCutFromMoment(
  moment,
  analysis,
  mediaIndex = 0,
  isFirstCut = true
) {
  const start =
    Math.max(
      0,
      numberOr(
        moment?.start,
        0
      )
    );

  const end =
    Math.max(
      start + 0.5,
      numberOr(
        moment?.end,
        start + 5
      )
    );

  /*
   * Renderer intentionally limits individual cuts
   * to a maximum of 6 seconds.
   */
  const sourceDuration =
    clamp(
      end - start,
      0.5,
      6
    );

  const recommendedDuration =
    clamp(
      numberOr(
        analysis?.editingRecommendation
          ?.suggestedDuration,
        sourceDuration
      ),
      0.5,
      6
    );

  const duration =
    Math.min(
      sourceDuration,
      recommendedDuration
    );

  const speed =
    clamp(
      numberOr(
        analysis?.editingRecommendation
          ?.speed,
        1
      ),
      0.5,
      1.5
    );

  const textRecommendation =
    analysis?.textRecommendation || {};

  const useText =
    textRecommendation.useText === true;

  const text =
    useText
      ? cleanText(
          textRecommendation.text
        )
      : '';

  const cameraMovement =
    analysis?.shot
      ?.cameraMovement || '';

  const motionStyle =
    chooseMotionStyle(
      cameraMovement,
      analysis
    );

  const transition =
    chooseTransition(
      analysis?.transitionRecommendation,
      isFirstCut
    );

  return {
    mediaIndex,

    /*
     * Exact point in the source video
     * where the renderer should begin.
     */
    startTime: start,

    /*
     * How long this shot appears
     * in the finished edit.
     */
    duration,

    speed,

    transition,

    motionStyle,

    text,

    /*
     * Extra information retained for
     * the UI/editor timeline.
     */
    sourceStart: start,
    sourceEnd: end,

    description:
      cleanText(
        moment?.description
      ),

    reason:
      cleanText(
        moment?.reason
      )
  };
}

/**
 * Build an AI edit plan from Gemini analysis.
 *
 * @param {Object} analysis
 * @param {Object} options
 * @returns {Object}
 */
export function createAIEditPlan(
  analysis,
  options = {}
) {
  if (
    !analysis ||
    typeof analysis !== 'object'
  ) {
    throw new Error(
      'Cannot create an AI edit plan because Gemini analysis is missing.'
    );
  }

  const mediaIndex =
    numberOr(
      options.mediaIndex,
      0
    );

  const bestMoments =
    Array.isArray(
      analysis.bestMoments
    )
      ? analysis.bestMoments
      : [];

  /*
   * If Gemini supplied no best moments,
   * create a safe fallback from the full video.
   */
  let moments =
    bestMoments.filter(
      (moment) =>
        moment &&
        Number.isFinite(
          Number(moment.start)
        ) &&
        Number.isFinite(
          Number(moment.end)
        )
    );

  if (moments.length === 0) {
    const durationSeconds =
      clamp(
        numberOr(
          analysis.durationSeconds,
          5
        ),
        0.5,
        60
      );

    moments = [
      {
        start: 0,
        end: Math.min(
          durationSeconds,
          6
        ),
        description:
          'Primary video moment',
        reason:
          'Fallback edit moment because Gemini supplied no timestamped best moment.'
      }
    ];
  }

  /*
   * At this stage we deliberately use the strongest
   * Gemini moments only.
   *
   * Later, with multiple uploaded clips, this planner
   * will rank and combine moments from different files.
   */
  const strongestMoment =
    moments[0];

  const cuts = [
    buildCutFromMoment(
      strongestMoment,
      analysis,
      mediaIndex,
      true
    )
  ];

  /*
   * Keep the first version conservative.
   *
   * We do not want the planner inventing extra shots
   * that Gemini did not identify.
   */
  const cinematicScore =
    clamp(
      numberOr(
        analysis.cinematicScore,
        0
      ),
      0,
      10
    );

  const subject =
    analysis.subject || {};

  const shot =
    analysis.shot || {};

  const editingRecommendation =
    analysis.editingRecommendation ||
    {};

  return {
    version: 1,

    type:
      'bikeztagram-ai-edit-plan',

    cinematicScore,

    title:
      subject.motorcycleModel
        ? `${subject.motorcycleModel} — AI Edit`
        : 'AI Motorcycle Edit',

    source: {
      mediaIndex,

      filename:
        cleanText(
          options.filename
        ),

      durationSeconds:
        numberOr(
          analysis.durationSeconds,
          null
        )
    },

    creativeDirection: {
      shotType:
        cleanText(
          shot.type
        ),

      cameraMovement:
        cleanText(
          shot.cameraMovement
        ),

      cameraAngle:
        cleanText(
          shot.cameraAngle
        ),

      visualQuality:
        analysis.visualQuality ||
        {},

      action:
        cleanText(
          analysis.action
        ),

      editorialNotes:
        cleanText(
          analysis.editorialNotes
        )
    },

    music: {
      enabled: true,

      source:
        'original-local-pulse',

      bpm: 112
    },

    cuts,

    summary: {
      role:
        cleanText(
          editingRecommendation.role
        ),

      suggestedDuration:
        numberOr(
          editingRecommendation.suggestedDuration,
          cuts.reduce(
            (total, cut) =>
              total + cut.duration,
            0
          )
        ),

      speed:
        numberOr(
          editingRecommendation.speed,
          1
        ),

      slowMotion:
        editingRecommendation
          .slowMotion === true,

      text:
        cuts[0]?.text || '',

      transition:
        cuts[0]?.transition || 'hard-cut',

      motion:
        cuts[0]?.motionStyle || 'static'
    }
  };
}

/**
 * Human-readable description for the UI.
 */
export function describeAIEditPlan(
  plan
) {
  if (
    !plan ||
    !Array.isArray(plan.cuts)
  ) {
    return 'No AI edit plan available.';
  }

  const lines = [];

  lines.push(
    plan.title ||
      'AI Motorcycle Edit'
  );

  lines.push(
    `Cinematic score: ${
      plan.cinematicScore
    }/10`
  );

  lines.push('');

  plan.cuts.forEach(
    (cut, index) => {
      lines.push(
        `CUT ${index + 1}`
      );

      lines.push(
        `Source: ${cut.startTime.toFixed(
          2
        )}s → ${(
          cut.startTime +
          cut.duration
        ).toFixed(2)}s`
      );

      lines.push(
        `Duration: ${cut.duration.toFixed(
          2
        )}s`
      );

      lines.push(
        `Speed: ${cut.speed}x`
      );

      lines.push(
        `Motion: ${
          cut.motionStyle
        }`
      );

      lines.push(
        `Transition: ${
          cut.transition
        }`
      );

      if (cut.text) {
        lines.push(
          `Text: ${cut.text}`
        );
      }

      if (cut.description) {
        lines.push(
          `Moment: ${
            cut.description
          }`
        );
      }

      lines.push('');
    }
  );

  return lines.join('\n');
      }
