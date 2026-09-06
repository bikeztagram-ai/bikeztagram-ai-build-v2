#!/usr/bin/env node
/** Static safety contract for the autonomous builder. */
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const workflow = read('.github/workflows/autonomous-builder-v2.yml');
const scheduler = read('.github/workflows/autonomous-builder-scheduler.yml');
const sustained = read('builder/runner/long-run-executor.mjs');
const feature = read('builder/runner/feature-brain.mjs');
const deterministic = read('builder/runner/deterministic-executor.mjs');
if (/GEMINI_API_KEY|gemini-cli|gemini-3/i.test(workflow + scheduler + sustained + feature + deterministic)) failures.push('forbidden AI provider reference in active AutoBot runtime');
if (/gh\s+pr\s+merge|gh\s+pr\s+approve/i.test(workflow + sustained + feature + deterministic)) failures.push('automatic merge/approval path detected');
if (/vercel\s+(deploy|promote)|vercel\.com\/api/i.test(workflow + sustained + feature + deterministic)) failures.push('automatic production deployment path detected');
if (!/cancel-in-progress:\s*false/.test(workflow)) failures.push('workflow must preserve queued runs rather than canceling active work');
if (!/cancel-in-progress:\s*false/.test(scheduler)) failures.push('scheduler must not cancel active work');
if (!workflow.includes('LOCAL_AI_MODEL')) failures.push('workflow lacks explicit local model configuration');
if (!workflow.includes('actions/cache@v4')) failures.push('local model cache missing');
if (!workflow.includes('segment-2')) failures.push('long-duration continuation segment missing');
if (!workflow.includes('gh pr create')) failures.push('review PR publication missing');
if (!workflow.includes('--draft')) failures.push('review PR must be draft by default');
if (!sustained.includes('verifyAuditLog')) failures.push('sustained runner missing audit verification');
if (!feature.includes('maxAttemptsPerFeature')) failures.push('feature engineer lacks bounded attempt ceiling');
if (!feature.includes('resetFailedPatch')) failures.push('feature engineer lacks failed-patch recovery');
if (!deterministic.includes('allowedTask')) failures.push('deterministic executor lacks protected-path guard');
if (!deterministic.includes('dependsOn')) failures.push('deterministic executor lacks task dependency handling');
if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot safety contract PASS: local-only AI, no automatic merge/deploy, non-canceling concurrency, bounded recovery, protected paths, dependency handling, audit verification, and resumable long-duration execution.');
