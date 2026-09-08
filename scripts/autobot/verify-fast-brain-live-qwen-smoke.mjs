#!/usr/bin/env node
/**
 * Live-model preflight. Unlike the deterministic harness, this invokes the
 * actual installed Qwen3 4B through the configured Ollama proxy and requires
 * the real repository-aware brain to make, verify and persist one throwaway
 * product-source edit. Failure here prevents the expensive production run.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bikeztagram-live-qwen-smoke-'));
const brain = fs.readFileSync(path.join(root, 'builder/runner/repository-aware-feature-brain.mjs'), 'utf8');
const audit = fs.readFileSync(path.join(root, 'builder/quality/audit-log.mjs'), 'utf8');
const model = 'qwen3:4b-instruct-2507-q4_K_M';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11435';
const baseline = 'export const smokeMessage = "READY";\n';

function write(file, content) {
  const target = path.join(temp, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
function git(args) { execFileSync('git', args, { cwd: temp, stdio: 'inherit' }); }

try {
  write('builder/runner/repository-aware-feature-brain.mjs', brain);
  write('builder/quality/audit-log.mjs', audit);
  write('builder/brain/feature-objectives.json', JSON.stringify({ objectives: [{
    id: 'live-qwen-smoke',
    title: 'Live Qwen coding smoke test',
    priority: 100,
    files: ['src/Smoke.jsx'],
    acceptance: ['make one small real production-source improvement'],
    constraints: ['edit only the supplied source file', 'preserve valid JavaScript'],
    dependsOn: []
  }] }, null, 2));
  write('builder/working/repository-map.json', JSON.stringify({ version: 1, files: [{ path: 'src/Smoke.jsx', lines: 1, purpose: 'throwaway product source for live agent smoke' }], byPath: { 'src/Smoke.jsx': 0 }, dependencyEdges: [] }, null, 2));
  write('src/Smoke.jsx', baseline);
  write('package.json', JSON.stringify({ name: 'live-qwen-smoke', private: true, scripts: { build: 'node -e "process.exit(0)"' } }, null, 2));
  git(['init', '-q']);
  git(['config', 'user.email', 'smoke@example.invalid']);
  git(['config', 'user.name', 'Live Qwen Smoke']);
  git(['add', '.']);
  git(['commit', '-qm', 'live smoke baseline']);

  console.log(`[autobot] LIVE QWEN SMOKE: model=${model} host=${host}`);
  const result = spawnSync(process.execPath, ['builder/runner/repository-aware-feature-brain.mjs'], {
    cwd: temp,
    env: {
      ...process.env,
      OLLAMA_HOST: host,
      LOCAL_AI_MODEL: model,
      LOCAL_AI_READY: '1',
      BUILDER_MAX_MINUTES: '3',
      AUTOBOT_FEATURE_MAX_ATTEMPTS: '1',
      AUTOBOT_FEATURE_MAX_EDITS: '1',
      AUTOBOT_AGENT_TURNS: '6',
      AUTOBOT_FEATURE_PASSES: '1',
    },
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 210000,
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`live Qwen feature brain exited ${result.status}`);

  const changed = fs.readFileSync(path.join(temp, 'src/Smoke.jsx'), 'utf8');
  if (changed === baseline) throw new Error('live Qwen did not make a real source edit');
  if (!fs.existsSync(path.join(temp, 'builder/working/feature-brain-state.json'))) throw new Error('live Qwen did not persist feature state');
  const state = JSON.parse(fs.readFileSync(path.join(temp, 'builder/working/feature-brain-state.json'), 'utf8'));
  if (!state.completed?.includes('live-qwen-smoke')) throw new Error('live Qwen did not persist successful completion');
  console.log('[autobot] LIVE QWEN SMOKE PASS: actual Qwen3 4B made and verified a throwaway source change through the canonical multi-turn agent.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
