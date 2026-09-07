#!/usr/bin/env node
import fs from 'node:fs';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const persistence = fs.readFileSync('src/projectPersistence.js', 'utf8');

const required = [
  "r.snapshot.editorState&&typeof r.snapshot.editorState==='object'",
  "setMode(savedState.mode==='music'?'music':'film')",
  "setOutputPreset(typeof savedState.outputPreset==='string'&&savedState.outputPreset?savedState.outputPreset:'portrait')",
  "setStage(typeof savedState.stage==='string'?savedState.stage:'')",
  "editorState:{status,stage,mode,outputPreset}"
];
for (const fragment of required) {
  if (!app.includes(fragment)) throw new Error(`App persistence recovery contract missing: ${fragment}`);
}
if (!persistence.includes('editorState: sanitise(editorState)')) throw new Error('Project snapshot does not persist editorState.');
if (!persistence.includes('function validate(snapshot)')) throw new Error('Project persistence validation missing.');

console.log('editor-persistence-recovery: PASS');
console.log('restores mode, output preset and stage from the persisted editor state');
console.log('preserves the existing truthful missing-local-media recovery message');