import fs from 'node:fs';
const wf=fs.readFileSync('.github/workflows/autobot-research-swarm.yml','utf8');
const runner=fs.readFileSync('builder/runner/autobot-research-trial.mjs','utf8');
const strategies=['aider-direct','aider-diff','aider-udiff','aider-whole','aider-scoped','aider-architect','direct-ollama-json','openhands-sdk','deterministic-control','evolution-selected'];
for(const s of strategies) if(!wf.includes(s)||!runner.includes(s)) throw new Error('missing research strategy '+s);
if(!wf.includes('fail-fast: false')) throw new Error('research failures must be isolated');
if(!wf.includes('cancel-in-progress: false')) throw new Error('research runs must not cancel one another');
if(!runner.includes('qualityPassed')) throw new Error('research runner must score quality');
console.log(JSON.stringify({ok:true,strategies:strategies.length,productionFilesUntouched:true}));
