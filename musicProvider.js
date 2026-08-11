// Free-first music layer. V1 deliberately generates an original local pulse instead of
// downloading copyrighted music. Replace this provider with a licence-verified catalogue later.
export function createOriginalPulseWav(seconds = 45, bpm = 112) {
  const sampleRate = 44100;
  const frames = Math.floor(seconds * sampleRate);
  const buffer = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(buffer);
  const write = (offset, value) => view.setUint32(offset, value, true);
  const write16 = (offset, value) => view.setUint16(offset, value, true);
  write(0, 0x46464952); write(4, 36 + frames * 2); write(8, 0x45564157);
  write(12, 0x20746d66); write(16, 16); write16(20, 1); write16(22, 1);
  write(24, sampleRate); write(28, sampleRate * 2); write16(32, 2); write16(34, 16);
  write(36, 0x61746164); write(40, frames * 2);
  const beat = 60 / bpm;
  for (let i=0;i<frames;i++) {
    const t=i/sampleRate;
    const p=t%beat;
    const pulse=Math.exp(-p*14);
    const bass=Math.sin(2*Math.PI*55*t)*pulse*0.24;
    const pad=(Math.sin(2*Math.PI*110*t)+0.5*Math.sin(2*Math.PI*165*t))*0.035;
    const tick=Math.sin(2*Math.PI*880*t)*Math.exp(-p*55)*0.035;
    const sample=Math.max(-1,Math.min(1,bass+pad+tick));
    view.setInt16(44+i*2, sample*32767, true);
  }
  return new Blob([buffer], {type:'audio/wav'});
}
