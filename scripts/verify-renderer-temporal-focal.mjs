import fs from 'node:fs';
const r=fs.readFileSync('src/renderer.js','utf8');
const checks=[
 ['imports temporal focal merger',/import \{ mergeFocalMotion \} from ['"]\.\/temporalFocalInterpolator\.js['"]/.test(r)],
 ['passes temporal trajectory',/mergeFocalMotion\(baseMotion,cut\.temporalFocal,p/.test(r)],
 ['uses interpolated focal x',/temporalMotion\.focalX/.test(r)],
 ['uses interpolated focal y',/temporalMotion\.focalY/.test(r)],
 ['preserves authored focal scale',/staticFocal\.x\?\?\.5/.test(r)],
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){console.error('Renderer temporal focal integration FAILED');failed.forEach(([n])=>console.error(`- ${n}`));process.exit(1);}
console.log(`Renderer temporal focal integration PASS — ${checks.length} checks`);
