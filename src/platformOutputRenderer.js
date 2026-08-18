import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { getPlatformProfile } from './platformReframe.js';

const CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

function even(value) {
  const n = Math.max(2, Math.round(Number(value) || 2));
  return n % 2 ? n - 1 : n;
}

export function buildPlatformTranscodePlan(platform = 'reels', options = {}) {
  const profile = getPlatformProfile(platform);
  const width = even(profile.width);
  const height = even(profile.height);
  const fit = options.fit === 'contain' ? 'contain' : 'cover';
  const crop = fit === 'contain'
    ? `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
    : `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
  return { platform: profile.id, width, height, fps: Number(options.fps) || 30, aspect: profile.aspect, cropMode: fit, videoFilter: crop, outputExtension: 'mp4', outputMime: 'video/mp4' };
}

export async function transcodeForPlatform(sourceBlob, platform = 'reels', options = {}) {
  if (!(sourceBlob instanceof Blob) || sourceBlob.size === 0) throw new Error('Platform transcode requires a non-empty rendered video Blob.');
  const plan = buildPlatformTranscodePlan(platform, options);
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({ coreURL: await toBlobURL(`${CORE_URL}/ffmpeg-core.js`, 'text/javascript'), wasmURL: await toBlobURL(`${CORE_URL}/ffmpeg-core.wasm`, 'application/wasm') });
  const inputName = sourceBlob.type.includes('mp4') ? 'input.mp4' : 'input.webm';
  await ffmpeg.writeFile(inputName, await fetchFile(sourceBlob));
  await ffmpeg.exec(['-i', inputName, '-vf', plan.videoFilter, '-r', String(plan.fps), '-c:v', 'libx264', '-preset', options.preset || 'veryfast', '-crf', String(options.crf || 20), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', 'output.mp4']);
  const data = await ffmpeg.readFile('output.mp4');
  if (!data?.length) throw new Error(`Platform transcode produced no output for ${plan.platform}.`);
  return { blob: new Blob([data.buffer], { type: plan.outputMime }), profile: plan };
}
