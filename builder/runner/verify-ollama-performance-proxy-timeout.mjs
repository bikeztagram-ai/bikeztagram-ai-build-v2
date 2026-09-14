#!/usr/bin/env node
/** Independent verifier: prove the proxy times out a hanging upstream and remains healthy. */
import { spawn } from 'node:child_process';
import http from 'node:http';

const target = process.env.AUTOBOT_LOCAL_TARGET || 'builder/runner/ollama-performance-proxy.mjs';
if (target !== 'builder/runner/ollama-performance-proxy.mjs') process.exit(0);
const proxyPort = 20500 + Math.floor(Math.random() * 500);
const upstreamPort = proxyPort + 1000;
const upstream = http.createServer((req, res) => {
  if (req.url === '/api/chat') return;
  res.writeHead(404); res.end();
});
await new Promise(resolve => upstream.listen(upstreamPort, '127.0.0.1', resolve));
const child = spawn(process.execPath, [target], {
  env: { ...process.env, OLLAMA_PROXY_PORT: String(proxyPort), OLLAMA_UPSTREAM: `http://127.0.0.1:${upstreamPort}` },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', x => { output += x.toString(); });
child.stderr.on('data', x => { output += x.toString(); });
const stop = () => { if (child.exitCode === null) child.kill('SIGTERM'); };
try {
  let healthy = false;
  for (let i = 0; i < 50; i += 1) {
    if (child.exitCode !== null) break;
    try {
      const r = await fetch(`http://127.0.0.1:${proxyPort}/health`, { signal: AbortSignal.timeout(300) });
      if (r.ok && (await r.text()).trim() === 'ok') { healthy = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!healthy) throw new Error('proxy failed initial health check; output: ' + output.slice(-3000));

  const started = Date.now();
  const responsePromise = fetch(`http://127.0.0.1:${proxyPort}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'test', messages: [{ role: 'user', content: 'test' }] }),
  });
  const response = await Promise.race([
    responsePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('proxy did not time out a hanging upstream within 2500ms')), 2500)),
  ]);
  const elapsed = Date.now() - started;
  if (response.status !== 502) throw new Error(`expected 502 after bounded timeout, received ${response.status} after ${elapsed}ms`);
  if (elapsed > 2400) throw new Error(`proxy timeout was too slow: ${elapsed}ms`);

  const after = await fetch(`http://127.0.0.1:${proxyPort}/health`, { signal: AbortSignal.timeout(500) });
  if (!after.ok || (await after.text()).trim() !== 'ok') throw new Error('proxy unhealthy after timeout');
  console.log(JSON.stringify({ ok: true, target, checks: ['initial-health', 'hanging-upstream-bounded-timeout-502', 'post-timeout-health'], elapsedMs: elapsed }));
} finally {
  stop();
  await new Promise(resolve => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); setTimeout(() => { stop(); resolve(); }, 1000); });
  upstream.close();
}
