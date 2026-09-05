import assert from 'node:assert/strict';
import { buildCreativeSceneGraph, interpretCreativeBrief } from '../src/universalCreativeEngine.js';

const cases=[
  ['Minecraft-style motorcycle chase at night in the rain','voxel','motorcycle'],
  ['GTA-inspired neon city pursuit with drones','urban','motorcycle'],
  ['Epic fantasy dragon over a medieval castle at sunset','fantasy','creature'],
  ['Underwater sci-fi submarine discovery','underwater','ship'],
  ['Fast cyberpunk street race with FPV camera','cyberpunk','subject'],
  ['Horror zombie chase through a foggy abandoned city','horror','character'],
  ['Mars expedition with a rover at dawn','mars','subject']
];

for(const [prompt,world,subject] of cases){
  const brief=interpretCreativeBrief(prompt,{duration:15});
  assert.equal(brief.world,world,`world detection failed: ${prompt}`);
  assert.equal(brief.subject,subject,`subject detection failed: ${prompt}`);
  const graph=buildCreativeSceneGraph(prompt,{duration:15,shots:6,seed:42});
  assert.equal(graph.local,true);
  assert.equal(graph.providers.video,'local');
  assert.equal(graph.providers.music,'local');
  assert.equal(graph.shots.length,6);
  assert.equal(graph.totalDuration,15);
  assert.ok(graph.shots.every(s=>s.duration>0));
  assert.ok(graph.shots.every(s=>s.depthLayers.length>=6));
  assert.ok(graph.shots.every(s=>s.effects.length>=0));
}

console.log('Universal creative engine: PASS');
