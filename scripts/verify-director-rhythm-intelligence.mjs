import { analyseDirectorRhythm } from '../src/directorRhythm.js';

const varied = [
  { purpose: 'hook', shotType: 'wide', description: 'road approach' },
  { purpose: 'build', shotType: 'close-up', description: 'detail of subject' },
  { purpose: 'action', shotType: 'tracking', description: 'fast movement' },
  { purpose: 'hero', shotType: 'wide', description: 'hero landscape' }
];
const repetitive = [
  { purpose: 'build', shotType: 'medium' },
  { purpose: 'build', shotType: 'medium' },
  { purpose: 'build', shotType: 'medium' },
  { purpose: 'build', shotType: 'medium' }
];
const a = analyseDirectorRhythm(varied);
const b = analyseDirectorRhythm(repetitive);
const checks = [
  ['varied sequence scores above repetitive sequence', a.score > b.score],
  ['varied sequence has shot-family variety', a.shotFamilyVariety > 0.5],
  ['repetitive sequence reports repeated families', b.repeatedFamilies >= 2],
  ['empty timeline is diagnosed', analyseDirectorRhythm([]).issues.includes('empty-timeline')]
];
const failures = checks.filter(([,ok]) => !ok);
if(failures.length){console.error('Director rhythm verification failed:');for(const [name] of failures)console.error(`- ${name}`);process.exit(1);}
console.log(`Director rhythm intelligence verification passed: ${checks.length}/${checks.length}`);
