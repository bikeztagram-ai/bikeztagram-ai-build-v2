// Free-first music layer. V1 deliberately generates an original local pulse instead of
// downloading copyrighted music. Replace this provider with a licence-verified catalogue later.
export function createOriginalPulseWav(seconds = 45, bpm = 112) {
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
