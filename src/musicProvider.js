// Free-first original soundtrack engine.
// This intentionally creates an original composition locally: no downloaded song,
// no named-song imitation and no paid music API is required for the safety fallback.
// The important difference from the old pulse is that this is now a small musical
// arrangement: kick, snare, hats, bass, tonal motif, pads, risers and impact/drop
// accents are all driven from the same beat/bar grid used by the editor.

const TAU = Math.PI * 2;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const frac = (v) => v - Math.floor(v);
const hash = (n) => frac(Math.sin(n * 12.9898 + 78.233) * 43758.5453);
const smooth = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function noise(n) {
  return hash(n) * 2 - 1;
}

function envelope(t, attack, decay, sustain, release, duration) {
  if (t < 0 || t >= duration + release) return 0;
  if (t < attack) return t / Math.max(attack, 0.0001);
  if (t < attack + decay) return 1 - (1 - sustain) * ((t - attack) / Math.max(decay, 0.0001));
  if (t < duration) return sustain;
  return sustain * (1 - (t - duration) / Math.max(release, 0.0001));
}

function kick(t) {
  if (t < 0 || t > 0.34) return 0;
  const e = Math.exp(-t * 14);
  const f = 42 + 78 * Math.exp(-t * 24);
  return Math.sin(TAU * f * t) * e * 0.82;
}

function snare(t, seed) {
  if (t < 0 || t > 0.22) return 0;
  const e = Math.exp(-t * 22);
  const body = Math.sin(TAU * 185 * t) * Math.exp(-t * 19) * 0.22;
  const grit = noise(Math.floor(t * 44100) + seed * 97) * e * 0.38;
  return (body + grit) * 0.82;
}

function hat(t, seed) {
  if (t < 0 || t > 0.07) return 0;
  const e = Math.exp(-t * 65);
  return noise(Math.floor(t * 44100) + seed * 131) * e * 0.13;
}

function bass(t, note, accent = 1) {
  if (t < 0 || t > 0.48) return 0;
  const f = midiHz(note);
  const e = envelope(t, 0.008, 0.07, 0.52, 0.09, 0.38);
  const sub = Math.sin(TAU * f * t);
  const harmonic = Math.sin(TAU * f * 2 * t) * 0.24;
  return (sub * 0.26 + harmonic * 0.09) * e * accent;
}

function pluck(t, note, accent = 1) {
  if (t < 0 || t > 0.5) return 0;
  const f = midiHz(note);
  const e = envelope(t, 0.003, 0.08, 0.08, 0.24, 0.13);
  const saw = 2 * frac(f * t) - 1;
  const tone = Math.sin(TAU * f * t) * 0.65 + saw * 0.22 + Math.sin(TAU * f * 2 * t) * 0.16;
  return tone * e * 0.16 * accent;
}

function pad(t, root, energy) {
  if (t < 0 || t > 2.2) return 0;
  const e = envelope(t, 0.25, 0.35, 0.7, 0.55, 1.45);
  const f = midiHz(root);
  const shimmer = Math.sin(TAU * f * 1.5 * t) * 0.18 + Math.sin(TAU * f * 2.01 * t) * 0.12;
  return (Math.sin(TAU * f * t) * 0.11 + shimmer) * e * (0.55 + energy * 0.45);
}

function riser(t, length, energy) {
  if (t < 0 || t > length) return 0;
  const p = clamp(t / length, 0, 1);
  const f = 220 + 1800 * p * p;
  return Math.sin(TAU * f * t) * Math.pow(p, 2.8) * (0.05 + energy * 0.07);
}

function impact(t, energy) {
  if (t < 0 || t > 0.65) return 0;
  const e = Math.exp(-t * 8);
  const low = Math.sin(TAU * (48 + 22 * Math.exp(-t * 15)) * t) * e * 0.58;
  const air = noise(Math.floor(t * 44100) + 901) * Math.exp(-t * 28) * 0.20;
  return (low + air) * (0.75 + energy * 0.25);
}

function writeWav(samples, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset, value) => view.setUint32(offset, value, true);
  const write16 = (offset, value) => view.setUint16(offset, value, true);
  write(0, 0x46464952); write(4, 36 + dataSize); write(8, 0x45564157);
  write(12, 0x20746d66); write(16, 16); write16(20, 1); write16(22, numChannels);
  write(24, sampleRate); write(28, byteRate); write16(32, blockAlign); write16(34, bitsPerSample);
  write(36, 0x61746164); write(40, dataSize);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, clamp(samples[i], -1, 1) * 32767, true);
  return new Blob([buffer], { type: 'audio/wav' });
}

export function createOriginalPulseWav(seconds = 45, bpm = 112) {
  const sampleRate = 44100;
  const totalSeconds = clamp(Number(seconds) || 15, 5, 60);
  const safeBpm = clamp(Number(bpm) || 112, 70, 150);
  const beat = 60 / safeBpm;
  const halfBeat = beat / 2;
  const bar = beat * 4;
  const frames = Math.floor(totalSeconds * sampleRate);
  const samples = new Float32Array(frames);

  // D-minor-ish original motif. Notes are intentionally simple and generated
  // procedurally so the fallback remains an original composition rather than an
  // imitation of a recognisable recording.
  const motif = [38, 38, 41, 45, 43, 41, 38, 36];
  const lead = [62, 65, 69, 67, 65, 62, 60, 57];

  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    const beatIndex = Math.floor(t / beat);
    const localBeat = (t % beat) / beat;
    const barIndex = Math.floor(t / bar);
    const barPos = t % bar;
    const energy = t < 2 ? 0.48 : t < 6 ? 0.72 : t < 11 ? 0.9 : 1.0;
    let s = 0;

    // Musical bed: low sub/bass on kick positions, changing each bar.
    const beatInBar = beatIndex % 4;
    if (localBeat < 0.16) {
      const bassNote = motif[(barIndex * 2 + beatInBar) % motif.length];
      s += bass((t % beat), bassNote, energy);
      s += kick(t % beat) * (beatInBar === 0 ? 1.12 : 0.86);
    }

    // Backbeat plus alternating ghost hit for a less robotic groove.
    if (beatInBar === 1 || beatInBar === 3) s += snare((t % beat), beatIndex) * energy;
    if (localBeat > 0.46 && localBeat < 0.54 && beatInBar === 3) s += snare((t % beat) - beat * 0.5, beatIndex + 11) * 0.22;

    // Eighth-note hats, with a stronger final eighth of each bar.
    const halfIndex = Math.floor(t / halfBeat);
    const halfPos = (t % halfBeat);
    if (halfPos < 0.035) {
      const hatEnergy = halfIndex % 8 === 7 ? 1.55 : (halfIndex % 2 ? 0.72 : 0.48);
      s += hat(halfPos, halfIndex) * hatEnergy * energy;
    }

    // Tonal motif enters after the intro and becomes brighter in the finale.
    if (t >= 2 && halfPos < 0.05) {
      const note = lead[(halfIndex + barIndex) % lead.length] + (t >= 11 ? 12 : 0);
      s += pluck(halfPos, note, energy * (t >= 6 ? 1.2 : 0.82));
    }

    // Atmospheric chord bed, refreshed every two bars.
    const chordStart = Math.floor(t / (bar * 2)) * (bar * 2);
    const chordTime = t - chordStart;
    if (chordTime < bar * 1.85) {
      const chordRoot = [50, 46, 43, 48][Math.floor(t / (bar * 2)) % 4];
      s += pad(chordTime, chordRoot, energy);
    }

    // Build: controlled riser before the first major drop.
    if (t >= 4.7 && t < 6) s += riser(t - 4.7, 1.3, 0.9);
    if (t >= 10 && t < 11) s += riser(t - 10, 1, 1.0);

    // Hard editorial drops at the main section and finale. These are deliberately
    // transient musical events so the editor has clear, repeatable downbeats to cut on.
    const dropTimes = [6, 11];
    for (const drop of dropTimes) {
      const dt = t - drop;
      if (dt >= 0 && dt < 0.65) s += impact(dt, 1);
    }

    // Tiny side-to-side-feeling harmonic variation without needing stereo rendering.
    s += Math.sin(TAU * 0.31 * t) * 0.012 * energy;
    samples[i] = s;
  }

  // Make the safety soundtrack properly audible. The previous implementation
  // peaked around -11 dBFS with a very low RMS, which made it sound thin on phones.
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0 ? Math.min(1.65, 0.89 / peak) : 1;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] * gain;
    samples[i] = Math.tanh(x * 1.12) / Math.tanh(1.12);
  }

  return writeWav(samples, sampleRate);
}
