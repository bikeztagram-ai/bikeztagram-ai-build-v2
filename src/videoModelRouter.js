/* BIKEZTAGRAM AI — generation model router. */

export function chooseVideoModel({ prompt = '', durationSeconds = 8, needsNativeAudio = true, needsCinematicControl = false, fastIteration = false } = {}) {
  const text = String(prompt).toLowerCase();
  const cinematic = needsCinematicControl || /cinematic|film|trailer|commercial|photorealistic|complex camera/.test(text);
  const audio = needsNativeAudio || /engine|music|sound|dialogue|voice|audio/.test(text);

  if (cinematic || audio) {
    return fastIteration ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';
  }

  if (fastIteration || durationSeconds <= 8) {
    return 'gemini-omni-flash-preview';
  }

  return 'veo-3.1-lite-generate-preview';
}

export function explainModelChoice(input, model) {
  return {
    model,
    reason: model.includes('veo-3.1')
      ? 'Selected for cinematic control, audio, or higher-fidelity generation.'
      : 'Selected for fast conversational generation and iteration.',
    input: {
      durationSeconds: input?.durationSeconds ?? 8,
      needsNativeAudio: input?.needsNativeAudio ?? true,
      needsCinematicControl: input?.needsCinematicControl ?? false,
      fastIteration: input?.fastIteration ?? false,
    },
  };
}
