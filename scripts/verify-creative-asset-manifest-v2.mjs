import assert from 'node:assert/strict';
import {createCreativeAssetManifest,getSubjectIds,findAsset} from '../src/creativeAssetManifestV2.js';
const m=createCreativeAssetManifest({assets:[{id:'bike',type:'image',url:'blob:bike',role:'source'}],subjects:[{id:'subject-bike',assetIds:['bike']}],style:{mood:'cinematic'}});
assert.equal(m.version,'creative-asset-manifest-v2');
assert.deepEqual(getSubjectIds(m),['subject-bike']);
assert.equal(findAsset(m,'bike').type,'image');
console.log('Creative asset manifest V2 verification passed');
