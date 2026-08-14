/*
 * BIKEZTAGRAM AI
 * AI Edit Plan Builder — cinematic V2
 *
 * Converts Gemini's ACTUAL video analysis into the
 * renderer-compatible plan.
 *
 * This file does not call Gemini.
 */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function firstDefined(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null
  );
}

function normaliseTransition(value, index, total) {
  const text =
    String(value || "").toLowerCase();

  if (index === 0) {
    return "fade-in";
  }

  if (index === total - 1 && text.includes("fade")) {
    return "fade-out";
  }

  if (
    text.includes("whip") &&
    text.includes("left")
  ) {
    return "whip-left";
  }

  if (
    text.includes("whip") &&
    text.includes("right")
  ) {
    return "whip-right";
  }

  if (
    text.includes("flash")
  ) {
    return "flash-cut";
  }

  if (
    text.includes("dip") ||
    text.includes("black")
  ) {
    return "dip-black";
  }

  if (
    text.includes("cross") ||
    text.includes("dissolve")
  ) {
    return "crossfade";
  }

  if (
    text.includes("fade")
  ) {
    return "fade";
  }

  /*
   * Hard cuts are preferred for action and when Gemini
   * has not asked for a specific transition.
   */
  return "hard-cut";
}

function inferMotion(
  value,
  moment,
  index
) {
  const text = [
    value,
    moment?.description,
    moment?.reason
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("pan left") ||
    text.includes("move left")
  ) {
    return "pan-left";
  }

  if (
    text.includes("pan right") ||
    text.includes("move right")
  ) {
    return "pan-right";
  }

  if (
    text.includes("tilt up") ||
    text.includes("upward")
  ) {
    return "tilt-up";
  }

  if (
    text.includes("tilt down") ||
    text.includes("downward")
  ) {
    return "tilt-down";
  }

  if (
    text.includes("pull back") ||
    text.includes("pull-out") ||
    text.includes("pull out")
  ) {
    return "slow-pull";
  }

  if (
    text.includes("push in") ||
    text.includes("push-in") ||
    text.includes("push")
  ) {
    return "slow-push";
  }

  /*
   * If Gemini sees an orbit/arc sweep, a subtle push is a
   * safer enhancement than inventing a large pan.
   */
  if (
    text.includes("orbit") ||
    text.includes("arc")
  ) {
    return index % 2 === 0
      ? "slow-push"
      : "pan-right";
  }

  if (
    text.includes("static") ||
    text.includes("locked")
  ) {
    return "static";
  }

  return "cinematic";
}

function inferPurpose(moment, index, total) {
  const text = [
    moment?.description,
    moment?.reason
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (index === 0) {
    return "opening";
  }

  if (index === total - 1) {
    return "hero-ending";
  }

  if (
    text.includes("action") ||
    text.includes("acceleration") ||
    text.includes("corner") ||
    text.includes("riding") ||
    text.includes("passing")
  ) {
    return "action";
  }

  if (
    text.includes("reveal") ||
    text.includes("three-quarter") ||
    text.includes("side profile")
  ) {
    return "reveal";
  }

  if (
    text.includes("detail") ||
    text.includes("exhaust") ||
    text.includes("tank") ||
    text.includes("front")
  ) {
    return "detail";
  }

  return "cinematic";
}

function inferSpeed(
  recommendation,
  moment,
  purpose
) {
  const recommended =
    numberOr(
      recommendation?.speed,
      1
    );

  let speed =
    clamp(
      recommended,
      0.5,
      1.5
    );

  const text = [
    moment?.description,
    moment?.reason
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    recommendation?.slowMotion &&
    speed >= 0.95
  ) {
    speed = 0.65;
  }

  if (
    purpose === "action" ||
    text.includes("fast") ||
    text.includes("acceleration")
  ) {
    speed =
      Math.max(
        speed,
        1.05
      );
  }

  if (
    purpose === "hero-ending" &&
    recommendation?.slowMotion
  ) {
    speed =
      Math.min(
        speed,
        0.72
      );
  }

  return clamp(
    speed,
    0.5,
    1.5
  );
}

function getMoments(analysis) {
  if (
    Array.isArray(
      analysis?.bestMoments
    )
  ) {
    return analysis.bestMoments;
  }

  if (
    Array.isArray(
      analysis?.cuts
    )
  ) {
    return analysis.cuts;
  }

  if (
    Array.isArray(
      analysis?.plan?.cuts
    )
  ) {
    return analysis.plan.cuts;
  }

  return [];
}

function buildCutsFromMoments(
  analysis,
  options
) {
  const moments =
    getMoments(analysis);

  if (!moments.length) {
    return [];
  }

  const recommendation =
    analysis?.editingRecommendation ||
    {};

  const textRecommendation =
    analysis?.textRecommendation ||
    {};

  const transitionRecommendation =
    analysis?.transitionRecommendation ||
    "";

  const motionRecommendation =
    analysis?.motionRecommendation ||
    "";

  const total =
    moments.length;

  const maxCuts =
    clamp(
      numberOr(options.maxCuts, 8),
      1,
      30
    );

  const targetDuration =
    clamp(
      numberOr(
        options.targetDuration,
        15
      ),
      5,
      60
    );

  const cuts = [];

  let totalDuration = 0;

  for (
    let index = 0;
    index < moments.length &&
    cuts.length < maxCuts;
    index++
  ) {
    const moment =
      moments[index] || {};

    const start =
      Math.max(
        0,
        numberOr(
          firstDefined(
            moment.start,
            moment.startTime
          ),
          0
        )
      );

    const end =
      numberOr(
        firstDefined(
          moment.end,
          moment.endTime
        ),
        NaN
      );

    let duration =
      Number.isFinite(end) &&
      end > start
        ? end - start
        : numberOr(
            recommendation.suggestedDuration,
            2.5
          );

    duration =
      clamp(
        duration,
        0.5,
        8
      );

    const remaining =
      targetDuration -
      totalDuration;

    if (
      remaining <= 0 &&
      cuts.length >= 3
    ) {
      break;
    }

    if (
      remaining > 0
    ) {
      duration =
        Math.min(
          duration,
          remaining
        );
    }

    /*
     * Avoid tiny accidental fragments.
     */
    if (
      duration < 0.5 &&
      cuts.length > 0
    ) {
      break;
    }

    const purpose =
      inferPurpose(
        moment,
        index,
        total
      );

    const motion =
      inferMotion(
        [
          moment.motionStyle,
          moment.motion,
          motionRecommendation,
          analysis?.shot?.cameraMovement
        ]
          .filter(Boolean)
          .join(" "),
        moment,
        index
      );

    const speed =
      inferSpeed(
        recommendation,
        moment,
        purpose
      );

    const transition =
      normaliseTransition(
        firstDefined(
          moment.transition,
          transitionRecommendation
        ),
        index,
        total
      );

    let text = "";

    /*
     * Keep text deliberately sparse. Gemini can override it
     * on an individual moment, otherwise use its first-shot
     * recommendation.
     */
    if (
      moment.text
    ) {
      text =
        String(
          moment.text
        ).trim();
    } else if (
      index === 0 &&
      textRecommendation.useText
    ) {
      text =
        String(
          textRecommendation.text ||
            ""
        ).trim();
    }

    /*
     * A strong hero ending can repeat no text by default.
     */
    if (
      purpose === "hero-ending" &&
      index > 0 &&
      !moment.text
    ) {
      text = "";
    }

    const colorGrade =
      firstDefined(
        moment.colorGrade,
        analysis?.colorGrade,
        options.colorGrade,
        "dark-cinematic"
      );

    const stabilization =
      Boolean(
        firstDefined(
          moment.stabilization,
          moment.stabilize,
          recommendation.stabilization,
          recommendation.stabilize,
          true
        )
      );

    cuts.push({
      mediaIndex: 0,
      mediaId: "video-0",

      startTime: start,

      duration:
        clamp(
          duration,
          0.5,
          8
        ),

      purpose,

      speed,

      transition,

      motionStyle: motion,

      motionIntensity:
        purpose === "hero-ending"
          ? 0.75
          : 0.9,

      stabilization,

      colorGrade,

      text,

      textIn:
        index === 0
          ? 0.10
          : 0.14,

      textOut:
        index === 0
          ? 0.82
          : 0.88,

      textStyle: "cinematic"
    });

    totalDuration += duration;
  }

  /*
   * Prefer the footage's actual best moments. If Gemini
   * returned only 11 seconds of usable footage, do not
   * invent a 15-second timeline.
   */
  return cuts;
}

/**
 * Convert Gemini's actual analysis into the renderer plan.
 */
export function createAIEditPlan(
  analysis,
  options = {}
) {
  const targetDuration =
    clamp(
      numberOr(
        options.targetDuration,
        15
      ),
      5,
      60
    );

  const cuts =
    buildCutsFromMoments(
      analysis,
      {
        ...options,
        targetDuration
      }
    );

  /*
   * Safety fallback.
   */
  if (!cuts.length) {
    cuts.push({
      mediaIndex: 0,
      mediaId: "video-0",
      startTime: 0,
      duration: Math.min(
        targetDuration,
        3
      ),
      purpose: "cinematic",
      speed: 1,
      transition: "fade-in",
      motionStyle: "cinematic",
      motionIntensity: 0.8,
      stabilization: true,
      colorGrade:
        options.colorGrade ||
        "dark-cinematic",
      text: "",
      textIn: 0.1,
      textOut: 0.9,
      textStyle: "cinematic"
    });
  }

  return {
    title:
      analysis?.subject?.motorcycleModel
        ? `${analysis.subject.motorcycleModel} — AI Cinematic Edit`
        : "AI Cinematic Motorcycle Edit",

    style:
      "cinematic motorcycle trailer",

    colorGrade:
      analysis?.colorGrade ||
      options.colorGrade ||
      "dark-cinematic",

    stabilization: true,

    textOverlay:
      analysis?.textRecommendation?.useText
        ? String(
            analysis.textRecommendation.text ||
              ""
          )
        : "",

    cuts,

    duration: cuts.reduce(
      (sum, cut) =>
        sum +
        numberOr(
          cut.duration,
          0
        ),
      0
    ),

    targetDuration,

    source:
      "gemini-analysis",

    generatedAt:
      new Date().toISOString()
  };
}

/**
 * Human-readable description for the UI.
 */
export function describeAIEditPlan(plan) {
  if (
    !plan ||
    !Array.isArray(plan.cuts)
  ) {
    return "No AI edit plan available.";
  }

  const duration =
    plan.cuts.reduce(
      (sum, cut) =>
        sum +
        numberOr(
          cut.duration,
          0
        ),
      0
    );

  const motionCount =
    plan.cuts.filter(
      (cut) =>
        String(
          cut.motionStyle || ""
        ).toLowerCase() !==
        "static"
    ).length;

  return [
    `AI edit plan: ${plan.cuts.length} cuts`,
    `Total duration: ${duration.toFixed(1)}s`,
    `${motionCount} cinematic motion shots`,
    `Source: ${plan.source || "AI"}`
  ].join(" • ");
}
