import fs from 'node:fs';
const p='src/timelineDirector.js'; let s=fs.readFileSync(p,'utf8');
if(s.includes('avoidTransitionRepeat')) process.exit(0);
const helper=`\nfunction avoidTransitionRepeat(transition,index,cuts,flags){\n if(index<2)return transition;\n const previous=String(cuts[index-1]?.transition||'');\n if(transition!==previous)return transition;\n const alternatives=flags.action?['flash-cut','whip-right','zoom-punch']:flags.dark?['crossfade','dip-black']:flags.emotional?['crossfade','hard-cut']:['hard-cut','crossfade','flash-cut'];\n return alternatives.find(t=>t!==previous)||transition;\n}\n`;
s=s.replace('function sourceId(cut){',helper+'\nfunction sourceId(cut){');
s=s.replace('cut.transition=transitionFor(index,total,flags,cut.transition);','cut.transition=avoidTransitionRepeat(transitionFor(index,total,flags,cut.transition),index,cuts,flags);');
fs.writeFileSync(p,s);
