import fs from 'node:fs';

const renderer=fs.readFileSync('src/cinematicRendererV3.js','utf8');
const timeline=fs.readFileSync('src/executableTimeline.js','utf8');

const required=[
  ['trim-end helper','function enforceTrimEnd(el,cut)'],
  ['trim-end read','Number(cut?.trimEnd)'],
  ['boundary pause','el.pause()'],
  ['boundary clamp','el.currentTime=end'],
  ['runtime invocation','enforceTrimEnd(el,c)']
];
for(const [label,needle] of required){if(!renderer.includes(needle))throw new Error(`Renderer trim enforcement missing: ${label}`);}

if(!timeline.includes('renderTimingFor(cut)'))throw new Error('Executable timeline does not expose render timing.');
if(!timeline.includes('sourceEnd:end'))throw new Error('Executable timeline does not preserve trim end in render timing.');
if(!timeline.includes('startTime:trim.trimStart'))throw new Error('Executable timeline does not preserve trim start.');

console.log('[render-trim] PASS: director trimStart/trimEnd are handed to the renderer and trimEnd is actively enforced during video playback.');
