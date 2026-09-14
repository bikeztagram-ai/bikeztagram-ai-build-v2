#!/usr/bin/env node
/** Independent behavioural verifier for the targeted self-evolution proxy. */
import { spawn } from 'node:child_process';

const root = process.cwd();
const target = process.env.AUTOBOT_LOCAL_TARGET || 'builder/runner/ollama-performance-proxy.mjs';
if (target !== 'builder/runner/ollama-performance-proxy.mjs') {
  console.log('No behavioural verifier required for target: ' + target);
  process.exit(0);
}

const port = 20500 + Math.floor(Math.random() * 1000);
const child = spawn(process.execPath, [target], {
  cwd: root,
  env: { ...process.env, OLLAMA_PROXY_PORT: String(port), OLLAMA_UPSTREAM: 'http://127.0.0.1:9' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });

function stop() {
  if (child.exitCode === null) child.kill('SIGTERM');
}

async function waitForHealth() {
  for (let i = 0; i < 50; i += 1) {
    if (child.exitCode !== null) return false;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(300) });
      if (response.ok && (await response.text()).trim() === 'ok') return true;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

try {
  if (!(await waitForHealth())) {
    throw new Error('proxy failed initial /health check; output: ' + output.slice(-3000));
  }

  const response = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'test', messages: [{ role: 'user', content: 'test' }] }),
    signal: AbortSignal.timeout(3000),
  });
  if (response.status !== 502) {
    throw new Error(`expected 502 from unreachable upstream, received ${response.status}; output: ${output.slice(-3000)}`);
  }

  const after = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) });
  if (!after.ok || (await after.text()).trim() !== 'ok') {
    throw new Error('proxy became unhealthy after upstream failure; output: ' + output.slice(-3000));
  }

  console.log(JSON.stringify({ ok: true, target, checks: ['initial-health', 'unreachable-upstream-502', 'post-failure-health'] }));
} finally {
  stop();
  await new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); resolve(); }, 1000);
  });
}
