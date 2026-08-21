import assert from 'node:assert/strict';
import {createModelExecutionManifest,validateModelExecutionManifest} from '../src/modelExecutionManifestV1.js';
const m=createModelExecutionManifest({modelId:'candidate',version:'1.0',runtime:'local',capabilities:['image-to-video']});assert.equal(validateModelExecutionManifest(m).valid,true);assert.equal(validateModelExecutionManifest(createModelExecutionManifest()).valid,false);console.log('Model execution manifest V1 verification passed');
