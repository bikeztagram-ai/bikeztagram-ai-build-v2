/* BIKEZTAGRAM AI — browser capability checks. £0-only. */
export function getCinematicCapabilities(env = globalThis) {
  const mediaRecorder = Boolean(env.MediaRecorder);
  const canvasStream = Boolean(env.HTMLCanvasElement?.prototype?.captureStream);
  const blob = Boolean(env.Blob);
  const url = Boolean(env.URL?.createObjectURL);
  const audio = Boolean(env.AudioContext || env.webkitAudioContext);
  return { mediaRecorder, canvasStream, blob, url, audio, trailerAssembly: mediaRecorder && canvasStream && blob && url };
}

export function assertTrailerAssemblySupport(env = globalThis) {
  const capabilities = getCinematicCapabilities(env);
  if (!capabilities.trailerAssembly) throw new Error('This browser cannot assemble cinematic trailers locally.');
  return capabilities;
}
