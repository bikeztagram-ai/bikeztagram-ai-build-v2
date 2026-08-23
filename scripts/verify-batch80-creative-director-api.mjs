import assert from 'node:assert/strict';
import handler from '../api/creative-director.js';

function responseMock(){return{statusCode:200,body:null,status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};}

const req={method:'POST',body:{prompt:'make a dark cinematic motorcycle film with a reveal and action peak',duration:15,aspectRatio:'9:16',assets:[{id:'asset-1',name:'bike-road.mp4',type:'video/mp4',duration:8,width:1920,height:1080,subjectId:'bike'}]}};
const res=responseMock();
await handler(req,res);
assert.equal(res.statusCode,200);
assert.equal(res.body.success,true);
assert.equal(res.body.plan.version,'complete-film-plan-v2');
assert.equal(res.body.plan.generatedScenes.length,4);
assert.equal(res.body.plan.music.original,true);
assert.equal(res.body.deployment,'manual-only');
console.log('batch80-creative-director-api: PASS');
