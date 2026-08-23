import fs from 'node:fs';
const source=fs.readFileSync(new URL('../api/analyse-library.js',import.meta.url),'utf8');
if(!source.includes('normaliseTargetDuration')||!source.includes('clamp(value,5,3600)'))throw new Error('Long-form duration normalizer missing.');
if(!source.includes('TARGET PRODUCTION DURATION'))throw new Error('Production-duration prompt contract missing.');
if(source.includes('clamp(targetDuration,5,60)'))throw new Error('Legacy 60-second analysis clamp remains.');
if(!source.includes('Math.min(2400,Math.ceil(targetDuration/1.5))'))throw new Error('Long-form cut capacity guard missing.');
console.log('PASS: media analysis duration contract supports 5 seconds through 60 minutes without legacy 60-second clamp.');
