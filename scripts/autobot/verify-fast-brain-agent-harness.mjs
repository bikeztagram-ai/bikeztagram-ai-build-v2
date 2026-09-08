#!/usr/bin/env node
/**
 * Deterministic integration harness for the ACTIVE repository-aware Qwen agent.
 * It replaces Ollama with a tiny scripted /api/chat server and runs the real
 * feature brain end-to-end: read_file -> edit_file -> run_check -> submit.
 * This proves the orchestration, tool protocol, edit guard, verification,
 * snapshots and completion path without consuming a live model run.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync, spawn } from 'node:child_process';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bikeztagram-fast-brain-harness-'));
const brainSource = fs.readFileSync(path.join(root, 'builder/runner/repository-aware-feature-brain.mjs'), 'utf8');
const auditSource = fs.readFileSync(path.join(root, 'builder/quality/audit-log.mjs'), 'utf8');
const steps = [
  { function: { name: 'read_file', arguments: { file: 'src/App.jsx', start: 1, end: 20 } } },
  { function: { name: 'edit_file', arguments: { file: 'src/App.jsx', search: 'export default function App(){return <div>Harness</div>}', replace: 'export default function App(){return <div>Harness verified</div>}' } } },
  { function: { name: 'run_check', arguments: { check: 'diff-check' } } },
  { function: { name: 'submit', arguments: { summary: 'Deterministic integration harness verified the canonical tool protocol.' } } },
];
let calls = 0;
let server;

function sh(command, args, cwd = temp) { execFileSync(command, args, { cwd, stdio: 'inherit' }); }
function write(file, content) { const target = path.join(temp, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content); }

try {
  write('builder/runner/repository-aware-feature-brain.mjs', brainSource);
  write('builder/quality/audit-log.mjs', auditSource);
  write('builder/brain/feature-objectives.json', JSON.stringify({ objectives: [{
    id: 'harness-objective', title: 'Harness objective', priority: 100,
    files: ['src/App.jsx'], acceptance: ['make one real product-source improvement'], constraints: ['edit only the supplied file'], dependsOn: []
  }] }, null, 2));
  write('builder/working/repository-map.json', JSON.stringify({ version: 1, files: [{ path: 'src/App.jsx', lines: 1, purpose: 'Harness product file' }], byPath: { 'src/App.jsx': 0 }, dependencyEdges: [] }, null, 2));
  write('src/App.jsx', 'export default function App(){return <div>Harness</div>}\n');
  write('package.json', JSON.stringify({ name: 'fast-brain-harness', private: true, scripts: { build: 'node -e "process.exit(0)"' } }, null, 2));
  sh('git', ['init', '-q']);
  sh('git', ['config', 'user.email', 'harness@example.invalid']);
  sh('git', ['config', 'user.name', 'Fast Brain Harness']);
  sh('git', ['add', '.']);
  sh('git', ['commit', '-qm', 'harness baseline']);

  server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/api/chat') { res.writeHead(404); res.end(); return; }
    for await (const _chunk of req) { /* drain request */ }
    const step = steps[calls++];
    if (!step) { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'unexpected extra model call' })); return; }
    const body = { model: 'qwen3:4b-instruct-2507-q4_K_M', message: { role: 'assistant', tool_calls: [step] } };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const child = spawn(process.execPath, ['builder/runner/repository-aware-feature-brain.mjs'], {
    cwd: temp,
    env: {
      ...process.env,
      OLLAMA_HOST: `http://127.0.0.1:${port}`,
      LOCAL_AI_MODEL: 'qwen3:4b-instruct-2507-q4_K_M',
      BUILDER_MAX_MINUTES: '2',
      AUTOBOT_FEATURE_MAX_ATTEMPTS: '1',
      AUTOBOT_FEATURE_MAX_EDITS: '1',
      AUTOBOT_AGENT_TURNS: '4',
      AUTOBOT_FEATURE_PASSES: '1',
    },
    stdio: 'inherit',
  });
  const exitCode = await new Promise((resolve) => child.on('close', resolve));
  if (exitCode !== 0) throw new Error(`active feature brain exited ${exitCode}`);
  if (calls !== 4) throw new Error(`expected exactly 4 scripted model calls, got ${calls}`);
  const changed = fs.readFileSync(path.join(temp, 'src/App.jsx'), 'utf8');
  if (!changed.includes('Harness verified')) throw new Error('real product-source edit was not applied');
  const state = JSON.parse(fs.readFileSync(path.join(temp, 'builder/working/feature-brain-state.json'), 'utf8'));
  if (!state.completed?.includes('harness-objective')) throw new Error('objective completion was not persisted');
  console.log('[autobot] Fast Brain agent harness PASS: real active brain completed read_file -> edit_file -> run_check -> submit with durable completion.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  fs.rmSync(temp, { recursive: true, force: true });
}
