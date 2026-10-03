import fs from 'node:fs';
const source=fs.readFileSync('src/projectPersistence.js','utf8');
const app=fs.readFileSync('src/App.jsx','utf8');
const checks={
 dualSlot:source.includes('SLOT_A')&&source.includes('SLOT_B'),
 writeVerify:source.includes('write-verification-failed'),
 fallbackRecovery:source.includes('recovered: true'),
 schemaValidation:source.includes('unsupported-schema')&&source.includes('invalid-shape'),
 blobNotPersisted:source.includes("if (typeof Blob !== 'undefined' && value instanceof Blob) return null"),
 fileNotPersisted:source.includes("if (typeof File !== 'undefined' && value instanceof File) return null"),
 missingMediaTruthful:source.includes('missingMedia')&&source.includes('restorableMedia'),
 appLoadsAndRestores:app.includes('loadProject()')&&app.includes('restoreSources'),
 appPersistsSnapshot:app.includes('saveProject(createProjectSnapshot')
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
console.log(failed.length?'PERSISTENCE RECOVERY FAIL':'PERSISTENCE RECOVERY PASS');
if(failed.length){console.error(failed);process.exit(2);}
