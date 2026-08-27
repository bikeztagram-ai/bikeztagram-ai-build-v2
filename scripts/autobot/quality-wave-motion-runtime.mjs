import fs from 'node:fs';
const p='src/director.js'; const s=fs.readFileSync(p,'utf8');
if(s.includes('buildSubjectAwareMotion')) process.exit(0);
const add=`\nexport function buildSubjectAwareMotion(shot={}, subjectType='unknown'){\n const type=String(shot?.type||shot?.intent||'').toLowerCase();\n const subject=String(subjectType||'unknown').toLowerCase();\n const base=buildShotMotion(shot);\n if(subject==='vehicle'&&(/action|movement/.test(type))) return {...base,type:'orbit-push',scale:Math.max(base.scale,1.08),intensity:1.15};\n if(subject==='landscape'&&(/hero|reveal/.test(type))) return {...base,type:'slow-pan',scale:1.04,intensity:.72};\n if(subject==='person'&&/detail|portrait/.test(type)) return {...base,type:'micro-push',scale:1.03,intensity:.62};\n return {...base,intensity:type.includes('action')?1.1:.85};\n}\n`;
fs.writeFileSync(p,s+add);
