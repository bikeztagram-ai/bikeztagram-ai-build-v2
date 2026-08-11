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
  const segmentFiles = [];

  // Step 1: Process each media item individually into a standard 1080x1920 30fps segment
  for (let i = 0; i < plan.cuts.length; i++) {
    const cut = plan.cuts[i];
    const m = files.get(cut.mediaId);
    if (!m?.file) continue;

    const rawInput = `raw_${i}.${ext(m.name)}`;
    const segOutput = `seg_${i}.ts`;
    await ffmpeg.writeFile(rawInput, await fetchFile(m.file));

    const filter = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`;

    if (m.type.startsWith('image')) {
      await ffmpeg.exec([
        '-loop', '1',
        '-i', rawInput,
        '-vf', filter,
        '-t', String(cut.duration || 3),
        '-c:v', 'mpeg2video',
        '-q:v', '2',
        segOutput
      ]);
    } else {
      await ffmpeg.exec([
        '-ss', String(cut.start || 0),
        '-i', rawInput,
        '-vf', filter,
        '-t', String(cut.duration || 3),
        '-c:v', 'mpeg2video',
        '-q:v', '2',
        '-an',
        segOutput
      ]);
    }

    segmentFiles.push(segOutput);
    await ffmpeg.deleteFile(rawInput).catch(() => {});
  }

  // Step 2: Combine segments using concat protocol
  const concatList = segmentFiles.map(f => `file '${f}'`).join('\n');
  await ffmpeg.writeFile('concat.txt', concatList);

  // Step 3: Generate audio pulse
  const musicBlob = createOriginalPulseWav(Math.max(30, plan.duration + 4), 112);
  await ffmpeg.writeFile('pulse.wav', await fetchFile(musicBlob));

  // Step 4: Final export
  const outputFile = 'bikeztagram-ai-v' + (plan.version || 1) + '.mp4';
  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-i', 'pulse.wav',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-shortest',
    outputFile
  ]);

  const data = await ffmpeg.readFile(outputFile);
  const blob = new Blob([data.buffer], { type: 'video/mp4' });

  // Cleanup temporary files
  for (const seg of segmentFiles) {
    await ffmpeg.deleteFile(seg).catch(() => {});
  }
  await ffmpeg.deleteFile('concat.txt').catch(() => {});
  await ffmpeg.deleteFile('pulse.wav').catch(() => {});

  onProgress?.(100);
  return blob;
}
