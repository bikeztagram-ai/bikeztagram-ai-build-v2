import assert from 'node:assert/strict';
import { buildDirectorRuntimeSelection } from '../src/directorRuntimeAdapter.js';

const analysis={
  prompt:'fast cinematic motorcycle reveal',
  sources:[
    { mediaIndex:0, type:'image/jpeg', name:'wide mountain landscape', width:1920, height:1080, score:88, cinematicScore:88 },
    { mediaIndex:1, type:'video/mp4', name:'rider approach mountain road journey', durationInSeconds:5, width:1920, height:1080, cinematicScore:86, visualQuality:{detail:.8,contrast:.8} },
    { mediaIndex:2, type:'video/mp4', name:'motorcycle accelerating cornering speed', durationInSeconds:6, width:1920, height:1080, cinematicScore:94, visualQuality:{detail:.9,contrast:.85,sharpness:.9}, bestMoments:[{motionScore:.95,score:96}] },
    { mediaIndex:3, type:'image/jpeg', name:'hero motorcycle reveal close-up detail', width:1080, height:1350, score:91, cinematicScore:91, visualQuality:{detail:.95,contrast:.8} },
    { mediaIndex:4, type:'image/jpeg', name:'rider portrait dramatic', width:1080, height:1350, score:84, cinematicScore:84 }
  ],
  bestMoments:[
    {mediaIndex:0,sourceIndex:0,score:88,description:'wide mountain landscape sunset',editorialRole:'cinematic-build'},
    {mediaIndex:1,sourceIndex:1,score:86,description:'rider approach mountain road journey',editorialRole:'cinematic-build'},
    {mediaIndex:2,sourceIndex:2,score:96,motionScore:.95,description:'motorcycle accelerating cornering speed',editorialRole:'action'},
    {mediaIndex:3,sourceIndex:3,score:91,description:'hero motorcycle reveal close-up detail',editorialRole:'hero-ending'},
    {mediaIndex:4,sourceIndex:4,score:84,description:'rider portrait dramatic',editorialRole:'reveal'}
  ]
};

const result=buildDirectorRuntimeSelection(analysis,{creativePrompt:analysis.prompt,maxCuts:5});
assert.equal(result.source,'director-v3-runtime');
assert.equal(result.coverage.length,5);
assert.deepEqual(result.coverage.map(item=>item.role),['hook','build','action','reveal','hero-ending']);
assert.equal(result.analysis.aiEditPlan.cuts.length,5);
assert.equal(new Set(result.analysis.aiEditPlan.cuts.map(cut=>cut.mediaIndex)).size,5);
assert.ok(result.analysis.aiEditPlan.cuts.every(cut=>Number.isInteger(cut.momentIndex)&&cut.momentIndex>=0));
assert.equal(result.analysis.directorDecision.version,'universal-director-runtime-v1');

const sparse=buildDirectorRuntimeSelection({bestMoments:[{score:70,description:'first unindexed clip'},{score:65,description:'second unindexed clip'}]}, {creativePrompt:'anything',maxCuts:2});
assert.deepEqual(sparse.analysis.aiEditPlan.cuts.map(cut=>cut.mediaIndex),[0,1]);
assert.deepEqual(sparse.analysis.aiEditPlan.cuts.map(cut=>cut.sourceIndex),[0,1]);
assert.deepEqual(sparse.analysis.aiEditPlan.cuts.map(cut=>cut.momentIndex),[0,1]);

const single=buildDirectorRuntimeSelection({bestMoments:[{score:70,description:'unknown clip'}]}, {creativePrompt:'anything',maxCuts:5});
assert.equal(single.analysis.aiEditPlan.cuts.length,1);
assert.equal(single.analysis.aiEditPlan.cuts[0].momentIndex,0);

const aggregated=buildDirectorRuntimeSelection({
  sources:[
    {mediaIndex:0,type:'video/mp4',name:'mixed source',score:25,cinematicScore:25},
    {mediaIndex:1,type:'video/mp4',name:'ordinary source',score:65,cinematicScore:65}
  ],
  bestMoments:[
    {mediaIndex:0,sourceIndex:0,score:20,cinematicScore:20,description:'weak opening'},
    {mediaIndex:0,sourceIndex:0,score:98,cinematicScore:98,motionScore:.98,description:'motorcycle accelerating high quality action'},
    {mediaIndex:1,sourceIndex:1,score:65,cinematicScore:65,description:'ordinary shot'}
  ]
},{creativePrompt:'fast motorcycle action',maxCuts:1});
assert.equal(aggregated.analysis.aiEditPlan.cuts.length,1);
assert.equal(aggregated.analysis.aiEditPlan.cuts[0].mediaIndex,0);
assert.equal(aggregated.analysis.aiEditPlan.cuts[0].momentIndex,1);

console.log('director-v3-runtime-integration: PASS');
