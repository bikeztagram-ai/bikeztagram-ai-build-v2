import fs from 'node:fs';

const main = fs.readFileSync('src/main.jsx', 'utf8');
const studio = fs.readFileSync('src/promptSceneSequenceStudio.jsx', 'utf8');
const generator = fs.readFileSync('src/proceduralSceneGeneratorV2.js', 'utf8');

const checks = [
  ['main mounts sequence studio', main.includes("import PromptSceneSequenceStudio from './promptSceneSequenceStudio.jsx';") && main.includes('<PromptSceneSequenceStudio />')],
  ['studio uses procedural generator', studio.includes("from './proceduralSceneGeneratorV2.js'")],
  ['three shot roles exist', ['HOOK', 'BUILD', 'HERO'].every(role => studio.includes(`['${role}'`))],
  ['provider-free generator contract retained', generator.includes('provider-free') && generator.includes('generateProceduralSceneV2')],
  ['generated scenes can be added to film library', studio.includes('DataTransfer') && studio.includes("#media-file")],
  ['12-source library limit enforced', studio.includes('> 12')],
  ['generated scenes remain original', studio.includes('Original procedural visuals only.')],
  ['progress is surfaced', studio.includes('onProgress') && studio.includes('BUILDING ${progress}%')]
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  console.error('Prompt scene sequence verification failed:');
  failures.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}
console.log(`Prompt scene sequence verification passed: ${checks.length}/${checks.length} checks.`);
