/*
 * BIKEZTAGRAM AI
 * AI Edit Plan Builder
 *
 * Converts Gemini's actual video analysis into the edit plan
 * understood by the existing Bikeztagram renderer.
 *
 * IMPORTANT:
 * This file does NOT call Gemini.
 * Gemini analysis has already happened before this function runs.
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
    (value) => value !== undefined && value !== null
  );
}

function normaliseTransition(value) {
  const transition = String(value || "").toLowerCase();

  if (
    transition.includes("fade") ||
    transition.includes("dissolve")
  ) {
    return "fade";
  }

  if (
    transition.includes("zoom") ||
    transition.includes("push")
  ) {
    return "zoom";
  }

  if (
    transition.includes("slide") ||
    transition.includes("wipe")
  ) {
    return "slide";
  }

  if (
    transition.includes("cut") ||
    transition.includes("hard")
  ) {
    return "cut";
  }

  return "crossfade";
}

function normaliseMotion(value) {
  const motion = String(value || "").toLowerCase();

  if (
    motion.includes("zoom") ||
    motion.includes("push")
  ) {
    return "zoom";
  }

  if (
    motion.includes("pan") ||
    motion.includes("move")
  ) {
    return "pan";
  }

  if (
    motion.includes("tilt")
  ) {
    return "tilt";
  }

  if (
    motion.includes("static") ||
    motion.includes("still")
  ) {
    return "static";
  }

  return "cinematic";
}

function getCuts(analysis) {
  if (!analysis) return [];

  if (Array.isArray(analysis.cuts)) {
    return analysis.cuts;
  }

  if (
    analysis.plan &&
    Array.isArray(analysis.plan.cuts)
  ) {
    return analysis.plan.cuts;
  }

  if (
    analysis.editPlan &&
    Array.isArray(analysis.editPlan.cuts)
  ) {
    return analysis.editPlan.cuts;
  }

  if (
    analysis.analysis &&
    Array.isArray(analysis.analysis.cuts)
  ) {
    return analysis.analysis.cuts;
  }

  return [];
}

function getMediaIndex(cut, fallbackIndex) {
  const value = firstDefined(
    cut.mediaIndex,
    cut.media,
    cut.clipIndex,
    cut.sourceIndex,
    cut.index
  );

  const index = Number(value);

  if (Number.isInteger(index) && index >= 0) {
    return index;
  }

  return fallbackIndex;
}

function getDuration(cut) {
  return clamp(
    numberOr(
      firstDefined(
        cut.duration,
        cut.length,
        cut.seconds
      ),
      2.5
    ),
    0.35,
    8
  );
}

function getStartTime(cut) {
  return Math.max(
    0,
    numberOr(
      firstDefined(
        cut.startTime,
        cut.start,
        cut.offset
      ),
      0
    )
  );
}

function getSpeed(cut) {
  return clamp(
    numberOr(
      firstDefined(
        cut.speed,
        cut.playbackRate,
        cut.rate
      ),
      1
    ),
    0.25,
    2.5
  );
}

function getText(cut) {
  const value = firstDefined(
    cut.text,
    cut.caption,
    cut.overlay,
    cut.title
  );

  if (!value) return "";

  return String(value).trim();
}

/**
 * Convert Gemini's analysis into the renderer's plan format.
 *
 * @param {Object} analysis Gemini analysis result
 * @param {Object} options Optional settings
 * @returns {Object} Renderer-compatible edit plan
 */
export function createAIEditPlan(
  analysis,
  options = {}
) {
  const sourceCuts = getCuts(analysis);

  const maxCuts = clamp(
    numberOr(options.maxCuts, 8),
    1,
    30
  );

  const targetDuration = clamp(
    numberOr(options.targetDuration, 15),
    5,
    60
  );

  const cuts = [];

  let totalDuration = 0;

  for (
    let i = 0;
    i < sourceCuts.length && cuts.length < maxCuts;
    i++
  ) {
    const cut = sourceCuts[i] || {};

    const duration = getDuration(cut);

    if (
      totalDuration >= targetDuration &&
      cuts.length >= 3
    ) {
      break;
    }

    const remaining =
      targetDuration - totalDuration;

    const finalDuration =
      remaining > 0
        ? Math.min(duration, remaining)
        : duration;

    cuts.push({
      mediaIndex: getMediaIndex(cut, i),

      startTime: getStartTime(cut),

      duration: clamp(
        finalDuration,
        0.35,
        8
      ),

      speed: getSpeed(cut),

      transition: normaliseTransition(
        firstDefined(
          cut.transition,
          cut.transitionType
        )
      ),

      motionStyle: normaliseMotion(
        firstDefined(
          cut.motionStyle,
          cut.motion,
          cut.cameraMotion
        )
      ),

      text: getText(cut)
    });

    totalDuration += finalDuration;
  }

  /*
   * Safety fallback:
   * If Gemini returned no usable cuts, create a simple
   * renderer-compatible plan rather than crashing.
   */
  if (cuts.length === 0) {
    cuts.push({
      mediaIndex: 0,
      startTime: 0,
      duration: Math.min(targetDuration, 3),
      speed: 1,
      transition: "cut",
      motionStyle: "cinematic",
      text: ""
    });
  }

  return {
    cuts,

    duration: cuts.reduce(
      (sum, cut) => sum + cut.duration,
      0
    ),

    targetDuration,

    source: "gemini-analysis",

    generatedAt: new Date().toISOString()
  };
}

/**
 * Human-readable description useful for the UI/debugging.
 */
export function describeAIEditPlan(plan) {
  if (
    !plan ||
    !Array.isArray(plan.cuts)
  ) {
    return "No AI edit plan available.";
  }

  const duration = plan.cuts.reduce(
    (sum, cut) =>
      sum + numberOr(cut.duration, 0),
    0
  );

  return [
    `AI edit plan: ${plan.cuts.length} cuts`,
    `Total duration: ${duration.toFixed(1)}s`,
    `Source: ${plan.source || "AI"}`
  ].join(" • ");
        }
