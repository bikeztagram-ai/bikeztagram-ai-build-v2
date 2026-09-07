#!/usr/bin/env node
/**
 * Canonical safety contract for the current AutoBot fast-brain runtime.
 * This verifier intentionally validates the fast workflow only; legacy segmented
 * builder workflows are not part of the active runtime contract.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];

const workflow = read('.github/workflows/autonomous-builder-v2-fast.yml');
const sustained = read('builder/runner/long-run-executor.mjs');
const feature = read('builder/runner/feature-brain.mjs');
const deterministic = read('builder/runner/deterministic-executor.mjs');
const gate = read('scripts/autobot/run-production-gate.mjs');
const packageJson = read('package.json');

if (/GEMINI_API_KEY|gemini-cli|gemini-3/i.test(workflow + sustained + feature)) failures.push('forbidden Gemini provider reference in active AutoBot runtime');
if (/gh\s+pr\s+merge|gh\s+pr\s+approve/i.test(workflow + sustained + feature)) failures.push('automatic merge/approval path detected');
if (/vercel\s+(deploy|promote)|vercel\.com\/api/i.test(workflow + sustained + feature)) failures.push('automatic production deployment path detected');

if (!/workflow_dispatch:/.test(workflow)) failures.push('canonical fast workflow must be manually dispatchable');
if (!/cancel-in-progress:\s*false/.test(workflow)) failures.push('fast workflow must preserve queued runs rather than canceling active work');
if (!workflow.includes('qwen2.5-coder:7b')) failures.push('fast workflow must default to Qwen2.5-Coder 7B');
if (!workflow.includes('LOCAL_AI_MODEL')) failures.push('fast workflow lacks explicit local model configuration');
if (!workflow.includes('actions/cache@v4')) failures.push('local model cache missing');
if (!workflow.includes('AUTOBOT_FEATURE_MAX_EDITS: 2')) failures.push('fast workflow edit budget missing');
if (!workflow.includes('LOCAL_AI_FEATURE_TIMEOUT_SECONDS: 120')) failures.push('fast workflow feature timeout contract missing');
if (!workflow.includes('verify-feature-brain-resilience.mjs')) failures.push('fast workflow lacks resilience verification');
if (!workflow.includes('verify-autobot-feature-edit-protocol.mjs')) failures.push('fast workflow lacks feature edit protocol verification');
if (!workflow.includes('verify-autobot-safety-contract-v3.mjs')) failures.push('fast workflow lacks v3 safety verification');
if (!workflow.includes('verify:autobot-production-gate')) failures.push('fast workflow lacks authoritative production gate');
if (!workflow.includes('Require a real product-source change')) failures.push('fast workflow lacks product-source success gate');
if (!workflow.includes("grep -E '^(src|public)/'")) failures.push('fast workflow product-source gate must include src and public');

if (!sustained.includes('feature-brain-started')) failures.push('sustained runner missing feature-cycle audit evidence');
if (!sustained.includes('deterministic-recoverable-failure')) failures.push('deterministic failures are not recoverable');
if (!sustained.includes('AUTOBOT_DETERMINISTIC_SLICE_MINUTES')) failures.push('deterministic work is not bounded into resumable slices');
if (!sustained.includes('AUTOBOT_FEATURE_SLICE_MINUTES')) failures.push('feature work is not bounded into resumable slices');
if (!sustained.includes('AUTOBOT_MAX_FEATURE_CYCLES')) failures.push('feature cycle ceiling missing');
if (!sustained.includes('writeRuntimeState')) failures.push('sustained runner lacks runtime checkpoint updates');
if (!sustained.includes('verifyAuditLog')) failures.push('sustained runner missing audit verification');

if (!feature.includes('maxAttemptsPerFeature')) failures.push('feature engineer lacks bounded attempt ceiling');
if (!feature.includes('snapshotFiles') || !feature.includes('restoreAttemptFiles')) failures.push('feature engineer lacks scoped failed-edit recovery');
if (/git.*reset.*--hard|git.*clean.*-f/.test(feature)) failures.push('feature engineer contains unsafe wholesale working-tree rollback');
if (!feature.includes('tools') || !feature.includes('edit_file') || !feature.includes('run_check')) failures.push('feature engineer must use bounded repository agent tools');
if (!feature.includes('out-of-scope file')) failures.push('feature engineer lacks edit scope guard');
if (!/multiple edits in one file/i.test(feature)) failures.push('feature engineer lacks bounded multi-edit guidance');
if (!feature.includes('progress[obj.id]')) failures.push('feature engineer lacks incremental progress tracking');
if (!/temperature:\s*0/.test(feature)) failures.push('feature engineer must use deterministic model temperature');
if (!feature.includes('agentic')) failures.push('feature engineer must expose agentic runtime evidence');

if (!deterministic.includes('allowedTask')) failures.push('deterministic executor lacks protected-path guard');
if (!deterministic.includes('dependsOn')) failures.push('deterministic executor lacks task dependency handling');
if (!gate.includes('verify:generation-capability-contract') || !gate.includes('verify:autobot-audit-tamper')) failures.push('authoritative production gate is incomplete');
if (!packageJson.includes('verify:autobot-production-gate')) failures.push('production gate is not registered in package scripts');

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('AutoBot canonical safety contract PASS: fast-brain-only runtime, local Qwen model, bounded agent tools, scoped rollback, incremental progress, recoverable deterministic work, product-source success gate, and authoritative production verification.');
