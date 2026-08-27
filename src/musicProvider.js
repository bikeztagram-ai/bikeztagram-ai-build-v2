// Free-first music layer. V1 deliberately generates an original local pulse instead of
// downloading copyrighted music. Replace this provider with a licence-verified catalogue later.

const DEFAULT_BPM = 112;

/** Return a deterministic beat grid for timeline-aware editing. */
export function createBeatGrid(seconds = 45, bpm = DEFAULT_BPM, subdivision = 1) {
  const duration = Number(seconds);
  const tempo = Number(bpm);
  const divisions = Number(subdivision);
  if (!Number.isFinite(duration) || duration <= 0) return [];
  if (!Number.isFinite(tempo) || tempo <= 0) return [];
  if (!Number.isInteger(divisions) || divisions < 1 || divisions > 8) return [];

  const step = 60 / tempo / divisions;
  const count = Math.ceil(duration / step);
  return Array.from({ length: count }, (_, index) => {
    const time = Number((index * step).toFixed(6));
    return {
      index,
      time,
      beat: index % divisions === 0,
      subdivision: index % divisions,
    };
  }).filter((cue) => cue.time < duration);
}

/**
 * Select deterministic musical edit cues near the supplied shot boundaries.
 * This is metadata only: it never downloads or embeds copyrighted audio.
 */
export function getMusicCueMarkers(shotDurations = [], bpm = DEFAULT_BPM) {
  if (!Array.isArray(shotDurations)) return [];
  const durations = shotDurations.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  const total = durations.reduce((sum, value) => sum + value, 0);
  const grid = createBeatGrid(total, bpm, 1);
  if (!grid.length) return [];

  const markers = [];
  let offset = 0;
  durations.forEach((duration, shotIndex) => {
    const boundary = offset + duration;
    const cue = grid.reduce((best, candidate) => {
      const bestDistance = Math.abs(best.time - boundary);
      const candidateDistance = Math.abs(candidate.time - boundary);
      return candidateDistance < bestDistance ? candidate : best;
    });
    markers.push({
      shotIndex,
      shotStart: Number(offset.toFixed(6)),
      shotEnd: Number(boundary.toFixed(6)),
      nearestBeat: cue.time,
      beatDistance: Number(Math.abs(cue.time - boundary).toFixed(6)),
    });
    offset = boundary;
  });
  return markers;
}

export function createOriginalPulseWav(seconds = 45, bpm = DEFAULT_BPM) {
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8; // 2 bytes per frame
  const byteRate = sampleRate * blockAlign;
  const frames = Math.floor(seconds * sampleRate);
  const dataSize = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const write = (offset, value) => view.setUint32(offset, value, true);
  const write16 = (offset, value) => view.setUint16(offset, value, true);

  // RIFF Header
  write(0, 0x46464952); // "RIFF"
  write(4, 36 + dataSize);
  write(8, 0x45564157); // "WAVE"

  // fmt Subchunk
  write(12, 0x20746d66); // "fmt "
  write(16, 16); // Subchunk1Size (16 for PCM)
  write16(20, 1); // AudioFormat (1 for PCM)
  write16(22, numChannels); // 1 channel (mono)
  write(24, sampleRate);
  write(28, byteRate);
  write16(32, blockAlign); // 1 * 16 / 8 = 2
  write16(34, bitsPerSample);

  // data Subchunk
  write(36, 0x61746164); // "data"
  write(40, dataSize);

  const beat = 60 / bpm;
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    const p = t % beat;
    const pulse = Math.exp(-p * 14);
    const bass = Math.sin(2 * Math.PI * 55 * t) * pulse * 0.24;
    const pad = (Math.sin(2 * Math.PI * 110 * t) + 0.5 * Math.sin(2 * Math.PI * 165 * t)) * 0.035;
    const tick = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-p * 55) * 0.035;
    const sample = Math.max(-1, Math.min(1, bass + pad + tick));
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
