/* BIKEZTAGRAM AI — browser capability preflight. £0-only. */

export function getCinematicBrowserCapabilities() {
  const mediaRecorder = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
  const captureStream = typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
  const audioContext = typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);
  const objectUrls = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
  return { mediaRecorder, captureStream, audioContext, objectUrls, assembly: mediaRecorder && captureStream && objectUrls };
}

export function assertCinematicAssemblySupport() {
  const capabilities = getCinematicBrowserCapabilities();
  if (!capabilities.assembly) throw new Error('This browser cannot assemble cinematic trailers locally.');
  return capabilities;
}
