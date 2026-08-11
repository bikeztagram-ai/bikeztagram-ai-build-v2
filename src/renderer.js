import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { createOriginalPulseWav } from './musicProvider';

let ffmpeg;
let loaded = false;

async function ensureFFmpeg(onProgress) {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress }) => onProgress?.(Math.round(progress * 100)));
    ffmpeg.on('log', ({ message }) => console.debug('[ffmpeg]', message));
  }
  if (!loaded) {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    });
    
    loaded = true;
  }
}

function ext(name) {
  const p = name.toLowerCase().split('.');
  return p[p.length - 1] || 'bin';
}

export async function renderProject(media, plan, onProgress) {
  if (!plan.cuts?.length) throw new Error('No selected shots to render.');
  await ensureFFmpeg(onProgress);
  const files = new Map(media.map(m => [m.id, m]));
  const inputNames = [];
  const filterParts = [];
  const labels = [];

  for (let i = 0; i < plan.cuts.length; i++) {
    const cut = plan.cuts[i];
    const m = files.get(cut.mediaId);
    if (!m?.file) continue;
    const input = `input_${i}.${ext(m.name)}`;
    await ffmpeg.writeFile(input, await fetchFile(m.file));
    inputNames.push(input);
    
    if (m.type.startsWith('image')) {
      filterParts.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}]`);
    } else {
      filterParts.push(`[${i}:v]trim=start=${cut.start}:duration=${cut.duration},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}]`);
    }
    labels.push(`[v${i}]`);
  }

  const concat = `${labels.join('')}concat=n=${labels.length}:v=1:a=0[outv]`;
  filterParts.push(concat);
  const musicBlob = createOriginalPulseWav(Math.max(30, plan.duration + 4), 112);
  await ffmpeg.writeFile('bikeztagram-pulse.wav', await fetchFile(musicBlob));

  const args = [];
  inputNames.forEach((n, i) => {
    const m = media.find(x => `input_${i}.${ext(x.name)}` === n);
    if (m?.type.startsWith('image')) {
      const cut = plan.cuts[i];
      args.push('-loop', '1', '-t', String(cut?.duration || 3));
    }
    args.push('-i', n);
  });

  args.push(
    '-i', 'bikeztagram-pulse.wav',
    '-filter_complex', filterParts.join(';'),
    '-map', '[outv]',
    '-map', `${inputNames.length}:a`,
    '-t', String(plan.duration),
    '-r', '30',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    'bikeztagram-ai-v' + (plan.version || 1) + '.mp4'
  );

  await ffmpeg.exec(args);
  const data = await ffmpeg.readFile('bikeztagram-ai-v' + (plan.version || 1) + '.mp4');
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  onProgress?.(100);
  return blob;
}
