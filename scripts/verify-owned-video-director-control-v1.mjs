import assert from 'node:assert/strict';
import {createVideoDirectionSpec,mapDirectionToShots} from '../src/ownedVideoDirectorControlV1.js';
const spec=createVideoDirectionSpec({prompt:'original cinematic sci-fi sequence',duration:10,subjects:[{id:'hero'}],actions:[{type:'walk'},{type:'run'}]});assert.equal(spec.requirements.preserveSubjects,true);const shots=mapDirectionToShots(spec);assert.equal(shots.length,3);assert.equal(shots[0].subjects[0].id,'hero');console.log('Owned video director control V1 verification passed');
