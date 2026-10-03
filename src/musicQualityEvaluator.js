const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function dbfs(rms) {
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

function rmsOf(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (const x of samples) sum += x * x;
  return Math.sqrt(sum / samples.length);
}

function peakOf(samples) {
  let peak = 0;
  for (const x of samples) peak = Math.max(peak, Math.abs(x));
  return peak;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function zeroCrossingRate(samples) {
  if (samples.length < 2) return 0;
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] < 0) !== (samples[i] < 0)) crossings++;
  }
  return crossings / (samples.length - 1);
}

function bandEnergy(samples, sampleRate, low, high) {
  if (!samples.length) return 0;
  const n = Math.min(samples.length, 32768);
  const step = Math.max(1, Math.floor(samples.length / n));
  let energy = 0;
  let count = 0;
  for (let i = 0; i < samples.length; i += step) {
    const t = i / sampleRate;
    const f = (sampleRate * ((i + 1) % 2048)) / 2048;
    if (f >= low && f < high) {
      energy += samples[i] * samples[i];
      count++;
    }
    if (t > 60 && count > 1000) break;
  }
  return count ? energy / count : 0;
}

function frameMetrics(samples, sampleRate, frameSeconds = 0.4) {
  const size = Math.max(256, Math.floor(sampleRate * frameSeconds));
  const values = [];
  for (let start = 0; start + size <= samples.length; start += size) {
    const frame = samples.subarray(start, start + size);
    values.push({ rms: rmsOf(frame), peak: peakOf(frame) });
  }
  return values;
}

function spectralCentroid(samples, sampleRate) {
  const n = Math.min(1024, samples.length);
  if (n < 16) return 0;
  const stride = Math.max(1, Math.floor(samples.length / n));
  const window = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = samples[i * stride] || 0;
    window[i] = x * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  let weighted = 0;
  let magnitude = 0;
  for (let k = 1; k < n / 2; k++) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const phase = (2 * Math.PI * k * i) / n;
      re += window[i] * Math.cos(phase);
      im -= window[i] * Math.sin(phase);
    }
    const mag = Math.hypot(re, im);
    const hz = (k * sampleRate) / n;
    weighted += hz * mag;
    magnitude += mag;
  }
  return magnitude ? weighted / magnitude : 0;
}

