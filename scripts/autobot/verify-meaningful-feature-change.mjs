import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const objectives=JSON.parse(fs.readFileSync('builder/brain/feature-objectives.json','utf8')).objectives||[];
const objectiveFiles=new Map();
for(const objective of objectives){for(const file of objective.files||[]){objectiveFiles.set(file,objective.id);}}

const diff=execFileSync('git',['diff','--unified=0','--no-ext-diff'],{encoding:'utf8'});
const changed=[...diff.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(m=>m[1]).filter(Boolean);
const productFiles=changed.filter(file=>objectiveFiles.has(file));
const additionsByFile=new Map();
for(const block of diff.split(/^diff --git /m).slice(1)){
  const header=block.match(/^a\/([^\s]+) b\/([^\s]+)$/m);
  if(!header)continue;
  const file=header[2];
  if(!objectiveFiles.has(file))continue;
  const additions=block.split('\n').filter(line=>line.startsWith('+')&&!line.startsWith('+++')).map(line=>line.slice(1).trim()).filter(line=>line&&!line.startsWith('//')&&!line.startsWith('/*')&&!line.startsWith('*')&&!line.startsWith('*/')&&!line.startsWith('#'));
  additionsByFile.set(file,additions.length);
}

if(!productFiles.length)throw new Error('No changed file belongs to a declared product feature objective.');
const meaningful=productFiles.filter(file=>(additionsByFile.get(file)||0)>=2);
if(!meaningful.length){
  const detail=productFiles.map(file=>`${file}: ${additionsByFile.get(file)||0} executable additions`).join(', ');
  throw new Error(`Product-source changes are too small to count as feature work (${detail}).`);
}

const objectivesTouched=[...new Set(meaningful.map(file=>objectiveFiles.get(file)))];
console.log(`[autobot] meaningful feature change PASS: ${meaningful.join(', ')}`);
console.log(`[autobot] objective areas advanced: ${objectivesTouched.join(', ')}`);
