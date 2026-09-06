import assert from 'node:assert/strict';
import { createArrangementProject, analyseArrangement, updateArrangementSection, toggleArrangementStem, repairArrangementProject } from '../src/musicArrangementRuntime.js';
import { evaluateMusicArrangement, suggestMusicArrangementRepairs } from '../src/musicArrangementQuality.js';

const project=createArrangementProject({brief:{prompt:'cinematic electronic trailer',duration:30}});
const initial=analyseArrangement(project);
assert.equal(project.version,4);
assert.ok(initial.quality);
assert.ok(['PASS','REVIEW','REJECT'].includes(initial.quality.verdict));
assert.ok(initial.quality.score>=0&&initial.quality.score<=100);
assert.ok(initial.quality.dimensions.structure>=0);
assert.ok(initial.quality.dimensions.rhythm>=0);

const muted=toggleArrangementStem(project,'melody');
assert.equal(analyseArrangement(muted).quality.score,initial.quality.score,'Intentional stem mute must not degrade intrinsic arrangement quality.');

const edited=updateArrangementSection(project,0,{energy:0.2,density:0.25});
const editedAnalysis=analyseArrangement(edited);
assert.ok(editedAnalysis.quality);
assert.ok(Array.isArray(editedAnalysis.repairSuggestions));

const repaired=repairArrangementProject(edited);
assert.ok(repaired.changed);
assert.ok(repaired.project.repairHistory.length>=1);
assert.ok(repaired.evaluation.score>=0&&repaired.evaluation.score<=100);
assert.ok(repaired.project.version>=5);

const rejected=evaluateMusicArrangement({brief:{duration:20},sections:[{start:0,end:20,energy:.5,density:.5}],beatGrid:[],drums:[],bass:[],harmony:[],melody:[],fx:[]});
assert.equal(rejected.verdict,'REJECT');
assert.ok(rejected.issues.includes('weak-section-arc'));
assert.ok(rejected.issues.includes('missing-stem-layer'));
assert.ok(rejected.issues.includes('weak-rhythmic-coverage'));
assert.ok(rejected.issues.includes('weak-melodic-variation'));
assert.ok(suggestMusicArrangementRepairs({},rejected).length>=3);

console.log('music-arrangement-quality: PASS',JSON.stringify({score:initial.quality.score,verdict:initial.quality.verdict,repairedScore:repaired.evaluation.score,issues:initial.quality.issues}));
