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
  const n = Math.min(samples.length, 8192);
  if (n < 16) return 0;
  let weighted = 0;
  let magnitude = 0;
  for (let k = 1; k < n / 2; k++) {
    let re = 0;
    let im = 0;
    const stride = Math.max(1, Math.floor(samples.length / n));
    for (let i = 0; i < n; i++) {
      const x = samples[i * stride] || 0;
      const phase = (2 * Math.PI * k * i) / n;
      re += x * Math.cos(phase);
      im -= x * Math.sin(phase);
    }
    const mag = Math.hypot(re, im);
    const hz = (k * sampleRate) / n;
    weighted += hz * mag;
    magnitude += mag;
  }
  return magnitude ? weighted / magnitude : 0;
}

/**
 * Browser-local music quality evaluator.
 *
 * This deliberately exposes measurements and a heuristic quality gate rather than
 * pretending that technical audio metrics are an objective "chart quality" score.
 * integratedLoudnessDb is a short-term/energy approximation, not a standards-certified
 * EBU R128 implementation.
 */
export function analyseMusicAudio({ channels, sampleRate, durationSeconds }) {
  if (!Array.isArray(channels) || !channels.length || !sampleRate) {
    throw new Error('Audio channels and sampleRate are required.');
  }
  const mono = new Float32Array(Math.max(...channels.map((c) => c.length)));
  let frames = 0;
  for (const channel of channels) frames = Math.max(frames, channel.length);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    let count = 0;
    for (const channel of channels) {
      if (i < channel.length) {
        sum += channel[i];
        count++;
      }
    }
    mono[i] = count ? sum / count : 0;
  }

  const rms = rmsOf(mono);
  const peak = peakOf(mono);
  const peakDbfs = peak > 0 ? dbfs(peak) : -Infinity;
  const shortTerm = frameMetrics(mono, sampleRate);
  const frameDb = shortTerm.map((x) => dbfs(x.rms)).filter(Number.isFinite);
  const integratedLoudnessDb = frameDb.length ? 10 * Math.log10(frameDb.reduce((sum, db) => sum + Math.pow(10, db / 10), 0) / frameDb.length) : -Infinity;
  const crestDb = rms > 0 ? 20 * Math.log10(peak / rms) : Infinity;
  const silentFrames = shortTerm.filter((x) => x.rms < 0.003).length;
  const silenceRatio = shortTerm.length ? silentFrames / shortTerm.length : 0;
  const dynamicDb = frameDb.length ? percentile(frameDb, 0.95) - percentile(frameDb, 0.1) : 0;
  const centroidHz = spectralCentroid(mono, sampleRate);
  const low = bandEnergy(mono, sampleRate, 20, 180);
  const lowMid = bandEnergy(mono, sampleRate, 180, 1000);
  const high = bandEnergy(mono, sampleRate, 4000, 12000);
  const lowMidRatio = lowMid > 0 ? low / lowMid : 0;
  const highMidRatio = lowMid > 0 ? high / lowMid : 0;

  const stereo = channels.length > 1
    ? (() => {
        const left = channels[0];
        const right = channels[1];
        const n = Math.min(left.length, right.length);
        let lr = 0; let ll = 0; let rr = 0;
        for (let i = 0; i < n; i++) {
          lr += left[i] * right[i];
          ll += left[i] * left[i];
          rr += right[i] * right[i];
        }
        const correlation = ll && rr ? clamp(lr / Math.sqrt(ll * rr), -1, 1) : 1;
        return { correlation, widthProxy: 1 - Math.max(0, correlation) };
      })()
    : { correlation: 1, widthProxy: 0 };

  const issues = [];
  if (peakDbfs > -0.1) issues.push('true-peak-risk');
  if (integratedLoudnessDb < -24) issues.push('too-quiet');
  if (integratedLoudnessDb > -7) issues.push('over-dense-master');
  if (dynamicDb < 3) issues.push('low-dynamic-contrast');
  if (silenceRatio > 0.2 && (durationSeconds || frames / sampleRate) > 10) issues.push('excessive-silence');
  if (stereo.correlation < -0.15) issues.push('phase-risk');
  if (lowMidRatio > 3.5) issues.push('low-end-dominant');
  if (highMidRatio > 1.8) issues.push('high-frequency-dominant');

  const scores = {
    loudness: clamp(100 - Math.max(0, -24 - integratedLoudnessDb) * 3 - Math.max(0, integratedLoudnessDb + 7) * 4, 0, 100),
    dynamics: clamp(dynamicDb * 12, 0, 100),
    headroom: clamp(((-0.1 - peakDbfs) * 80) + 90, 0, 100),
    stereo: clamp(100 - Math.max(0, -0.15 - stereo.correlation) * 180, 0, 100),
    tonalBalance: clamp(100 - Math.abs(Math.log10(Math.max(lowMidRatio, 0.001)) - 0.05) * 28 - Math.abs(Math.log10(Math.max(highMidRatio, 0.001)) + 0.35) * 18, 0, 100)
  };
  const technicalScore = Math.round(
    scores.loudness * 0.2 +
    scores.dynamics * 0.2 +
    scores.headroom * 0.2 +
    scores.stereo * 0.15 +
    scores.tonalBalance * 0.25
  );
  const verdict = technicalScore >= 85 && issues.length <= 1 ? 'PASS' : technicalScore >= 70 ? 'REVIEW' : 'REGENERATE';

  return {
    version: 'music-audio-quality-v1',
    metrics: {
      durationSeconds: durationSeconds ?? frames / sampleRate,
      channels: channels.length,
      sampleRate,
      peakDbfs,
      rmsDbfs: dbfs(rms),
      integratedLoudnessDb,
      crestDb,
      dynamicDb,
      silenceRatio,
      centroidHz,
      lowMidRatio,
      highMidRatio,
      stereoCorrelation: stereo.correlation,
      stereoWidthProxy: stereo.widthProxy
    },
    scores,
    technicalScore,
    issues,
    verdict
  };
}

export async function analyseMusicAudioBuffer(arrayBuffer) {
  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
    throw new Error('Web Audio API is not available in this runtime.');
  }
  const Ctx = AudioContext || webkitAudioContext;
  const context = new Ctx();
  try {
    const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i));
    return analyseMusicAudio({
      channels,
      sampleRate: decoded.sampleRate,
      durationSeconds: decoded.duration
    });
  } finally {
    await context.close().catch(() => {});
  }
}
