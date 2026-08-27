import assert from 'node:assert/strict';
import {validateGeneratedMedia,normaliseGeneratedMedia} from '../src/generatedMediaIngestionV1.js';
const m=normaliseGeneratedMedia({url:'blob:test',mimeType:'video/mp4',duration:4,width:720,height:1280,modelId:'candidate'});assert.equal(validateGeneratedMedia(m).valid,true);assert.equal(m.source,'generated');assert.equal(m.modelId,'candidate');console.log('Generated media ingestion V1 verification passed');
