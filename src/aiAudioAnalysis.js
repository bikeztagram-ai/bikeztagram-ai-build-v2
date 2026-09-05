/* Lightweight analysis of the actual rendered AI audio for edit-sync markers. */

export async function analyzeAudioBlob(blob, { maxMarkers = 96 } = {}) {
  if (!blob || typeof AudioContext === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  const context = new AudioCtx();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const channels = Math.min(buffer.numberOfChannels, 2);
    const sampleRate = buffer.sampleRate;
    const frameSize = Math.max(512, Math.floor(sampleRate * 0.05));
    const hop = Math.max(256, Math.floor(frameSize / 2));
    const mono = new Float32Array(buffer.length);
    for (let channel = 0; channel < channels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) mono[i] += data[i] / channels;
    }
    const frames = [];
    for (let start = 0; start + frameSize <= mono.length; start += hop) {
      let sum = 0;
      let flux = 0;
      for (let i = 0; i < frameSize; i += 1) {
        const value = mono[start + i];
        sum += value * value;
        const previous = i ? mono[start + i - 1] : mono[start + i];
        flux += Math.max(0, Math.abs(value) - Math.abs(previous));
      }
      frames.push({ time: start / sampleRate, rms: Math.sqrt(sum / frameSize), flux: flux / frameSize });
    }
    if (!frames.length) return null;
    const meanFlux = frames.reduce((sum, frame) => sum + frame.flux, 0) / frames.length;
    const threshold = Math.max(meanFlux * 1.8, 0.008);
    const impacts = frames.filter((frame, index) => frame.flux >= threshold && frame.flux >= (frames[index - 1]?.flux || 0) && frame.flux >= (frames[index + 1]?.flux || 0));
    const step = Math.max(1, Math.ceil(impacts.length / maxMarkers));
    const impactMarkers = impacts.filter((_, index) => index % step === 0).map((frame) => Number(frame.time.toFixed(3)));
    const beatGrid = frames.filter((frame, index) => frame.flux >= threshold * 0.65 && frame.rms > 0.01 && (index === 0 || frame.time - frames[index - 1].time >= 0.18)).slice(0, maxMarkers).map((frame) => Number(frame.time.toFixed(3)));
    return { duration: buffer.duration, sampleRate, rms: Number((frames.reduce((sum, frame) => sum + frame.rms, 0) / frames.length).toFixed(5)), beatGrid, impactMarkers };
  } finally {
    await context.close();
  }
}
