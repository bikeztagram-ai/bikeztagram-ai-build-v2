/* Browser-native analysis for generated audio: waveform energy, spectral centroid, onsets and beat candidates. */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

export async function analyzeAudioBlob(blob) {
  if (!(blob instanceof Blob) || !blob.size) return null;
  const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextCtor) return null;
  const context = new AudioContextCtor();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    const length = buffer.length;
    const channel = buffer.getChannelData(0);
    const frameSize = Math.max(512, Math.min(4096, Math.round(sampleRate * 0.0464)));
    const hop = Math.max(256, Math.floor(frameSize / 2));
    const energies = [];
    const spectral = [];
    const times = [];
    for (let start = 0; start + frameSize <= length; start += hop) {
      let energy = 0;
      let weighted = 0;
      let total = 0;
      const bins = 64;
      for (let k = 0; k < bins; k += 1) {
        let re = 0;
        let im = 0;
        for (let n = 0; n < frameSize; n += 1) {
          const sample = channel[start + n] || 0;
          const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (frameSize - 1));
          const angle = (2 * Math.PI * k * n) / frameSize;
          re += sample * window * Math.cos(angle);
          im -= sample * window * Math.sin(angle);
          energy += sample * sample / frameSize;
        }
        const magnitude = Math.sqrt(re * re + im * im);
        const frequency = (k * sampleRate) / frameSize;
        weighted += frequency * magnitude;
        total += magnitude;
      }
      energies.push(Math.sqrt(energy));
      spectral.push(total ? weighted / total : 0);
      times.push(start / sampleRate);
    }
    const floor = percentile(energies, 0.2);
    const ceiling = Math.max(percentile(energies, 0.9), floor + 1e-6);
    const normalized = energies.map((v) => clamp((v - floor) / (ceiling - floor), 0, 1));
    const impacts = [];
    for (let i = 1; i < normalized.length; i += 1) {
      const rise = normalized[i] - normalized[i - 1];
      const threshold = Math.max(0.16, percentile(normalized, 0.7) * 0.45);
      if (rise >= threshold && (impacts.length === 0 || times[i] - impacts[impacts.length - 1] >= 0.16)) impacts.push(times[i]);
    }
    const beatGrid = [];
    if (impacts.length >= 2) {
      const intervals = impacts.slice(1).map((time, i) => time - impacts[i]).filter((v) => v > 0.25 && v < 1.2);
      const median = percentile(intervals, 0.5);
      if (median) {
        let cursor = impacts[0];
        while (cursor < buffer.duration) {
          beatGrid.push(Number(cursor.toFixed(3)));
          cursor += median;
        }
      }
    }
    return {
      duration: buffer.duration,
      sampleRate,
      channels,
      frameSize,
      averageEnergy: energies.reduce((a, b) => a + b, 0) / Math.max(1, energies.length),
      peakEnergy: Math.max(...energies, 0),
      averageSpectralCentroid: spectral.reduce((a, b) => a + b, 0) / Math.max(1, spectral.length),
      energyCurve: times.map((time, i) => ({ time: Number(time.toFixed(3)), energy: Number(normalized[i].toFixed(3)) })),
      beatGrid,
      impactMarkers: impacts.map((time) => Number(time.toFixed(3))),
    };
  } finally {
    await context.close().catch(() => {});
  }
}
