#!/usr/bin/env node
/** Session 1 gate: prove the local brain is producing real product work, not activity. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const state = process.env.AUTOBOT_LOCAL_STATE || 'builder/working/local-brain-state.json';
const evidence = process.env.AUTOBOT_LOCAL_EVIDENCE || 'builder/working/local-brain-evidence.json';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
if (!fs.existsSync(state)) throw new Error('Session 1 gate: no local-brain state found.');
const s = read(state);
if (!Array.isArray(s.passes) || s.passes.length === 0) throw new Error('Session 1 gate: no local-brain passes recorded.');
const verified = s.passes.filter(p => p.status === 'verified' && p.changedFiles?.length);
const rejected = s.passes.filter(p => ['rejected','timeout','failed'].includes(p.status));
if (verified.length === 0) throw new Error('Session 1 gate: local brain produced no verified product change.');
const badPaths = verified.flatMap(p => p.changedFiles).filter(p => p.startsWith('.github/') || p.startsWith('builder/') || p.startsWith('config/'));
if (badPaths.length) throw new Error(`Session 1 gate: protected paths changed: ${badPaths.join(', ')}`);
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
fs.writeFileSync(evidence, JSON.stringify({session:1, verifiedPasses:verified.length, rejectedPasses:rejected.length, gate:'passed', checkedAt:new Date().toISOString()}, null, 2)+'\n');
console.log(`[autobot] SESSION 1 QUALITY GATE PASSED: ${verified.length} verified product change(s), ${rejected.length} rejected/failed pass(es).`);
