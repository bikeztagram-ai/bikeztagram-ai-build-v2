import fs from 'node:fs';
const adapter=fs.readFileSync('src/renderTemporalFocal.js','utf8');
const interpolator=fs.readFileSync('src/temporalFocalInterpolator.js','utf8');
const renderer=fs.readFileSync('src/renderer.js','utf8');
const checks=[
 ['adapter imports temporal interpolator',/from ['"]\.\/temporalFocalInterpolator\.js['"]/.test(adapter)],
 ['adapter resolves temporal render motion',/resolveRenderMotion/.test(adapter)],
 ['adapter resolves focal coordinates',/resolveRenderFocal/.test(adapter)],
 ['interpolator exports mergeFocalMotion',/export function mergeFocalMotion/.test(interpolator)],
 ['renderer currently imports adapter',/renderTemporalFocal/.test(renderer)],
];
const failed=checks.filter(([,ok])=>!ok);if(failed.length){console.error('Temporal focal render contract FAILED');for(const [name] of failed)console.error(`- ${name}`);process.exit(1);}console.log(`Temporal focal render adapter contract PASS — ${checks.length} checks`);
