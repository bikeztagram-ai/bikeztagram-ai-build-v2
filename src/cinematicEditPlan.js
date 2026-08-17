/* BIKEZTAGRAM AI — editor plan, independent of storage configuration. */

export function buildCinematicEditPlan({ clips = [], music = null, aspectRatio = '9:16', style = 'cinematic', instructions = '' } = {}) {
  const safeClips = Array.isArray(clips) ? clips : [];
  return {
    version: 1,
    aspectRatio,
    style,
    instructions: String(instructions).trim(),
    music,
    tracks: [{ id: 'video-main', type: 'video', clips: safeClips.map((clip, index) => ({
      id: clip.id || `clip-${index + 1}`,
      sourceId: clip.sourceId || clip.id || `source-${index + 1}`,
      start: Math.max(0, Number(clip.start) || 0),
      end: Math.max(0, Number(clip.end) || Number(clip.duration) || 1),
      speed: Math.max(0.25, Math.min(4, Number(clip.speed) || 1)),
      transition: clip.transition || null,
      lookId: clip.lookId || null,
    })) }],
    audio: music ? [{ id: 'music-main', type: 'music', sourceId: music.id || 'music', volume: Math.max(0, Math.min(1, Number(music.volume) || 0.8)) }] : [],
    captions: [],
  };
}

export function validateCinematicEditPlan(plan) {
  const errors = [];
  if (!plan?.tracks?.length) errors.push('No video track exists.');
  for (const track of plan?.tracks || []) {
    for (const clip of track.clips || []) {
      if (clip.end <= clip.start) errors.push(`${clip.id} has an invalid time range.`);
      if (clip.speed <= 0) errors.push(`${clip.id} has an invalid speed.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function addCaptionTrack(plan, captions = []) {
  return { ...plan, captions: captions.map((caption, index) => ({ id: caption.id || `caption-${index + 1}`, text: String(caption.text || ''), start: Math.max(0, Number(caption.start) || 0), end: Math.max(0, Number(caption.end) || 0), style: caption.style || 'cinematic' })) };
}
