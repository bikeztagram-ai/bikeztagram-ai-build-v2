#!/usr/bin/env node
/**
 * Canonical fan-in ledger writer for independent AutoBot specialist runs.
 * It never merges code. It records the worker's verified handoff/failure
 * against the immutable base and leaves integration to the protected review path.
 */
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
function fail(message) { throw new Error(message); }

const handoffPath = arg('--handoff');
const outcomePath = arg('--outcome');
const ledgerPath = arg('--ledger', 'builder/working/autobot-fan-in-ledger.json');
const coordinationId = String(arg('--coordination-id', process.env.AUTOBOT_COORDINATION_ID || '')).trim();
if (!handoffPath && !outcomePath) fail('Provide --handoff or --outcome.');
if (!coordinationId) fail('coordinationId is required; fan-in records must be grouped by one orchestration run.');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function readOptional(file) {
  if (!file || !fs.existsSync(file)) return null;
  return readJson(file);
}
const handoff = readOptional(handoffPath);
const outcome = readOptional(outcomePath);
const source = handoff || outcome;
if (!source) fail('No worker handoff/outcome could be read.');

const botId = String(source.botId || '').trim();
if (!botId) fail('Worker result is missing botId.');
const status = source.status === 'verified-candidate' || outcome?.status === 'success'
  ? 'completed'
  : source.repairable === true ? 'recovery'
  : source.category === 'no-product-change' ? 'review'
  : 'failed';

const record = {
  schemaVersion: 'autobot-fan-in-record-v1',
  coordinationId,
  botId,
  status,
  recordedAt: new Date().toISOString(),
  baseCommit: source.baseCommit || null,
  candidateCommit: source.candidateCommit || null,
  branch: source.branch || null,
  files: Array.isArray(source.ownsFiles) ? source.ownsFiles : (Array.isArray(source.files) ? source.files : []),
  objective: source.objective || null,
  repairable: source.repairable === true,
  category: source.category || (status === 'completed' ? 'completed' : 'unknown'),
  evidence: Array.isArray(source.evidence) ? source.evidence : [],
  error: source.error || null
};

fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
let ledger = { schemaVersion: 'autobot-fan-in-ledger-v1', coordinationId, updatedAt: null, workers: [] };
if (fs.existsSync(ledgerPath)) ledger = readJson(ledgerPath);
if (ledger.coordinationId && ledger.coordinationId !== coordinationId) fail('Ledger coordinationId does not match the worker result.');
ledger.coordinationId = coordinationId;
ledger.updatedAt = record.recordedAt;
ledger.workers = Array.isArray(ledger.workers) ? ledger.workers.filter(x => x.botId !== botId) : [];
ledger.workers.push(record);
ledger.workers.sort((a, b) => a.botId.localeCompare(b.botId));

const summary = ledger.workers.reduce((acc, worker) => {
  acc[worker.status] = (acc[worker.status] || 0) + 1;
  return acc;
}, {});
ledger.summary = summary;

fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, coordinationId, botId, status, summary, ledgerPath }));
