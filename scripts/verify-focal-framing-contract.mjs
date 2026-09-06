import fs from 'node:fs';

const planner=fs.readFileSync('src/aiEditPlanner.js','utf8');
const framing=fs.readFileSync('src/focalFraming.js','utf8');
const renderer=fs.readFileSync('src/renderer.js','utf8');

const checks=[
 ['planner imports focal framing',/from ['"]\.\/focalFraming\.js['"]/.test(planner)],
 ['planner attaches focal framing',/focalFraming/.test(planner)],
 ['framing clamps horizontal focal point',/clamp\(x,\.2,\.8\)/.test(framing)],
 ['framing clamps vertical focal point',/clamp\(y,\.2,\.8\)/.test(framing)],
 ['renderer consumes focal framing',/cut\.focalFraming/.test(renderer)],
 ['renderer clamps focal x',/clamp\(Number\(focal\?\.x\)/.test(renderer)],
 ['renderer clamps focal y',/clamp\(Number\(focal\?\.y\)/.test(renderer)],
 ['renderer bounds focal offset',/Math\.abs\(width-canvas\.width\)\*\.45/.test(renderer)],
 ['renderer bounds vertical offset',/Math\.abs\(height-canvas\.height\)\*\.45/.test(renderer)],
];
const failures=checks.filter(([,ok])=>!ok);
if(failures.length){console.error('Focal framing contract FAILED');for(const [name] of failures)console.error(`- ${name}`);process.exit(1);}
console.log(`Focal framing contract PASS — ${checks.length} checks`);
