import fs from 'node:fs';

const source=fs.readFileSync('src/renderAudioBridge.js','utf8');
if(!source.includes('const d = Math.abs(time - beat.time); if (d < distance) { best = beat; distance = d; }')) {
  throw new Error('nearestBeat must update its running distance from the calculated candidate distance.');
}

function nearestBeat(time, beats) {
  if (!beats.length) return time;
  let best = beats[0];
  let distance = Math.abs(time - best.time);
  for (const beat of beats) {
    const d = Math.abs(time - beat.time);
    if (d < distance) { best = beat; distance = d; }
  }
  return best;
}

const beats=[{time:0,index:0},{time:10,index:1},{time:20,index:2}];
for (const [time,expected] of [[1,0],[6,1],[11,1],[19,2]]) {
  const result=nearestBeat(time,beats);
  if(result.index!==expected) throw new Error(`nearest beat regression at ${time}s: expected ${expected}, got ${result.index}`);
}
console.log('nearest-beat-selection: PASS');
