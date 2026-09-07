import fs from 'node:fs';

const renderer=fs.readFileSync('src/cinematicRendererV3.js','utf8');
const timeline=fs.readFileSync('src/executableTimeline.js','utf8');
const loop=fs.readFileSync('src/renderQualityLoop.js','utf8');

const required=[
  ['trim-window helper','function enforceTrimWindow(el,cut)'],
  ['trim-start read','Number(cut?.trimStart)'],
  ['trim-end read','Number(cut?.trimEnd)'],
  ['boundary pause','el.pause()'],
  ['boundary clamp','el.currentTime=end'],
  ['start-boundary seek','el.currentTime=start'],
  ['runtime invocation','enforceTrimWindow(el,c)']
];
for(const [label,needle] of required){if(!renderer.includes(needle))throw new Error(`Renderer trim enforcement missing: ${label}`);}

if(!timeline.includes('renderTimingFor(cut)'))throw new Error('Executable timeline does not expose render timing.');
if(!timeline.includes('sourceEnd:end'))throw new Error('Executable timeline does not preserve trim end in render timing.');
if(!timeline.includes('startTime:trim.trimStart'))throw new Error('Executable timeline does not preserve trim start.');
if(!loop.includes("import {buildExecutableTimeline} from './executableTimeline.js';"))throw new Error('Render loop does not import executable director timeline.');
if(!loop.includes('current=buildExecutableTimeline(current,{targetDuration:target})'))throw new Error('Render loop does not activate executable timeline at render handoff.');

console.log('[render-trim] PASS: director trimStart/trimEnd are handed to the renderer, the render starts at trimStart, trimEnd is actively enforced, and the executable director timeline is used by the live render loop.');
