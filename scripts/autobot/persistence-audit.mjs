#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'src', 'App.jsx');
const app = fs.readFileSync(appPath, 'utf8');
const requiredState = ['files', 'sources', 'prompt', 'analysis', 'plan', 'productionPlan', 'soundtrack', 'exportInfo'];
const missing = requiredState.filter(name => !app.includes(`[${name},`));
if (missing.length) throw new Error(`Persistence audit could not locate expected App state anchors: ${missing.join(', ')}`);

const contract = {
  version: 1,
  generatedAt: new Date().toISOString(),
  excluded: ['File objects', 'Blob instances', 'Object URLs', 'large media payloads'],
  fields: {
    creativeBrief: 'prompt',
    directorPlan: 'plan',
    productionBlueprint: 'productionPlan',
    sourceMetadata: 'sources metadata only',
    soundtrackMetadata: 'soundtrack metadata only',
    exportSettings: 'exportInfo metadata only',
    recentEditorState: 'explicit serialisable editor state to be introduced by runtime unit'
  },
  recovery: ['schema validation', 'last-known-good record', 'corrupt/partial write rejection', 'truthful missing-media state']
};
const out = path.join(root, 'builder', 'working', 'persistence-contract.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(contract, null, 2) + '\n');
console.log(`[autobot] Persistence contract audit passed: ${out}`);
