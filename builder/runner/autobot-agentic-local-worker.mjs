#!/usr/bin/env node
/** Targeted local AutoBot repair worker. Model edits one file; controller validates it. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const target = process.env.AUTOBOT_LOCAL_TARGET || 'builder/runner/ollama-performance-proxy.mjs';
const allowed = new Set((process.env.AUTOBOT_ALLOWED_PATHS || target).split(',').map(s => s.trim()).filter(Boolean));
const model = process.env.AUTOBOT_AGENT_MODEL || 'local-qwen-coder-3b';
const apiBase = process.env.AUTOBOT_AGENT_API_BASE || 'http://127.0.0.1:8080/v1';
const maxOutputTokens = Number(process.env.AUTOBOT_AGENT_MAX_OUTPUT_TOKENS || 1400);
const requestTimeoutMs = Number(process.env.AUTOBOT_AGENT_REQUEST_TIMEOUT_MS || 180000);
const maxRepairAttempts = Number(process.env.AUTOBOT_AGENT_MAX_REPAIR_ATTEMPTS || 3);
const learningFiles = ['builder/working/aider-feature-brain-learning.json','builder/working/aider-feature-brain-state.json'];

function run(cmd, args, options = {}) { return spawnSync(cmd, args, { cwd: root, encoding: 'utf8', ...options }); }
function git(...args) { return run('git', args); }
function codeChanges() {
  const r = git('diff', '--name-only');
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}
function workingChanges() {
  const r = git('status', '--porcelain=v1', '--untracked-files=all');
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout.split(/\r?\n/).filter(Boolean).map(s => s.slice(3).trim()).filter(Boolean);
}
function learning() {
  return learningFiles.map(file => {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) return file + ': unavailable';
    try { return file + ': ' + fs.readFileSync(p, 'utf8').slice(-1400).replace(/\s+/g, ' ').trim(); }
    catch { return file + ': unreadable'; }
  }).join('\n');
}
function targetText() {
  const p = path.join(root, target);
  if (!fs.existsSync(p)) throw new Error('target does not exist: ' + target);
  return fs.readFileSync(p, 'utf8').slice(0, 12000);
}
function prompt(extra = '') {
  return [
    'You are the LOCAL REPAIR MODEL for Bikeztagram AI. SELF-EVOLUTION ONLY.',
    'Inspect exactly ONE allowed AutoBot engineering file and make ONE small useful reliability repair justified by the evidence.',
    'ALLOWED FILE: ' + target,
    'TARGET FILE:\n--- BEGIN FILE ---\n' + targetText() + '\n--- END FILE ---',
    'FAILURE EVIDENCE:\n' + learning(),
    'REPAIR DIRECTION: historical evidence reports upstream/local-model request timeouts. For this proxy target, add a REAL bounded upstream fetch deadline of about 10 seconds using a standard global AbortController and a timer that calls controller.abort(). The abort timer must be cleared after the upstream response/body has been fully consumed, and the timeout must be safely scoped for the catch path. Do not merely pass a controller signal without ever calling abort().',
    'HARD RULES:',
    '- Only change ' + target + '.',
    '- Make a concrete source-code change; unchanged output is invalid.',
    '- Never modify product code, workflows, package files, validators, policy, safety gates, secrets, or git configuration.',
    '- Do not weaken verification or safety.',
    '- Return ONLY the complete contents of the target file.',
    '- No diff, patch, markdown fences, explanation, or prose.',
    '- Preserve the shebang and valid Node.js 22 syntax.',
    '- IMPORTANT: Node.js 22 provides AbortController globally. NEVER import AbortController from node:abort-controller or any other node: module.',
    extra
  ].join('\n\n');
}
function extract(text) {
  const s = String(text || '').trim();
  const fenced = s.match(/```(?:javascript|js|mjs)?\s*\n([\s\S]*?)\n```/i);
  let out = (fenced ? fenced[1] : s).trim();
  const i = out.indexOf('#!/usr/bin/env node');
  if (i > 0) out = out.slice(i).trim();
  return out.startsWith('#!/usr/bin/env node') ? out + '\n' : '';
}
async function ask(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const r = await fetch(apiBase + '/chat/completions', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({model, messages:[
        {role:'system',content:'You are a conservative software repair model. Output only the complete requested source file.'},
        {role:'user',content:text}
      ], temperature:0, max_tokens:maxOutputTokens}),
      signal: controller.signal
    });
    const body = await r.text();
    if (!r.ok) throw new Error('local model HTTP ' + r.status + ': ' + body.slice(-3000));
    const parsed = JSON.parse(body);
    const out = parsed?.choices?.[0]?.message?.content;
    if (typeof out !== 'string' || !out.trim()) throw new Error('local model returned no text');
    return out;
  } finally { clearTimeout(timer); }
}
async function behavior(candidate) {
  if (target !== 'builder/runner/ollama-performance-proxy.mjs') return null;
  const proxyPort = 18436 + Math.floor(Math.random() * 1000);
  const upstreamPort = proxyPort + 1000;
  const upstream = http.createServer((req, res) => { if (req.url === '/api/chat') return; res.writeHead(404); res.end(); });
  await new Promise((resolve, reject) => { upstream.once('error', reject); upstream.listen(upstreamPort, '127.0.0.1', resolve); });
  const child = spawn(process.execPath, [candidate], {cwd:root, env:{...process.env,OLLAMA_PROXY_PORT:String(proxyPort),OLLAMA_UPSTREAM:'http://127.0.0.1:' + upstreamPort}, stdio:['ignore','pipe','pipe']});
  let output = '';
  child.stdout.on('data', x => { output += x.toString(); });
  child.stderr.on('data', x => { output += x.toString(); });
  const stop = () => { if (child.exitCode === null) child.kill('SIGTERM'); };
  try {
    let healthy = false;
    for (let i=0;i<50;i++) {
      if (child.exitCode !== null) break;
      try {
        const r = await fetch('http://127.0.0.1:' + proxyPort + '/health', {signal:AbortSignal.timeout(300)});
        if (r.ok && (await r.text()).trim() === 'ok') { healthy = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve,100));
    }
    if (!healthy) return 'target runtime health check failed; process output: ' + output.slice(-3000);
    const started = Date.now();
    let r;
    try {
      // The target's intended deadline is ~10s. Give the controller enough time
      // to exercise that deadline while still bounding a broken candidate.
      r = await fetch('http://127.0.0.1:' + proxyPort + '/api/chat', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'test',messages:[{role:'user',content:'test'}]}),signal:AbortSignal.timeout(13000)});
    } catch (e) { return 'target runtime POST /api/chat failed or hung: ' + e.message + '; process output: ' + output.slice(-3000); }
    const elapsed = Date.now() - started;
    if (r.status !== 502) return 'target runtime expected 502 from hanging upstream but received ' + r.status + ' after ' + elapsed + 'ms; process output: ' + output.slice(-3000);
    if (elapsed > 12500) return 'target runtime timeout was too slow: ' + elapsed + 'ms';
    try {
      const h = await fetch('http://127.0.0.1:' + proxyPort + '/health', {signal:AbortSignal.timeout(500)});
      if (!h.ok || (await h.text()).trim() !== 'ok') return 'target runtime became unhealthy after upstream timeout; process output: ' + output.slice(-3000);
    } catch (e) { return 'target runtime health check failed after upstream timeout: ' + e.message; }
    return null;
  } finally {
    stop();
    await new Promise(resolve => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); resolve(); }, 1000); });
    upstream.close();
  }
}
async function validate(candidate) {
  const syntax = run('node', ['--check', candidate]);
  if (syntax.status !== 0) return syntax.stderr || syntax.stdout || 'candidate syntax check failed';
  const source = fs.readFileSync(candidate, 'utf8');
  if (target === 'builder/runner/ollama-performance-proxy.mjs' && !source.includes('controller.abort()')) return 'candidate does not actually abort the upstream request; add a timer that calls controller.abort()';
  const badImport = source.match(/(?:from\s+['"]node:abort-controller['"]|require\(['"]node:abort-controller['"]\))/);
  if (badImport) return 'candidate imports node:abort-controller; Node.js 22 provides AbortController globally. Remove that import and use the global AbortController.';
  const b = await behavior(candidate);
  if (b) return b;
  const original = path.join(root,target);
  const d = run('git',['diff','--no-index','--unified=3','--',original,candidate]);
  if (d.status === 0) return 'candidate replacement contains no effective line changes';
  if (d.status !== 1) return d.stderr || d.stdout || 'failed to generate candidate diff';
  const lines = d.stdout.split(/\r?\n/);
  const di = lines.findIndex(x => x.startsWith('diff --git '));
  const oi = lines.findIndex(x => x.startsWith('--- '));
  const ni = lines.findIndex((x,i) => i > oi && x.startsWith('+++ '));
  if (di < 0 || oi < 0 || ni < 0) return 'controller could not locate generated diff headers';
  lines[di] = 'diff --git a/' + target + ' b/' + target;
  lines[oi] = '--- a/' + target;
  lines[ni] = '+++ b/' + target;
  return {patch:lines.join('\n').trim() + '\n'};
}
function rollback(initial) {
  for (const file of codeChanges().filter(x => !initial.has(x))) spawnSync('git',['restore','--',file],{cwd:root,stdio:'ignore'});
}
async function main() {
  if (!allowed.has(target)) throw new Error('target is not in allowed scope: ' + target);
  const dirty = workingChanges();
  if (dirty.length) throw new Error('real checkout is dirty before worker: ' + dirty.join(', '));
  const initial = new Set(dirty);
  const baseSha = git('rev-parse','HEAD').stdout.trim();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(),'autobot-local-'));
  const candidate = path.join(tempDir,path.basename(target));
  const patchPath = path.join(root,'builder/working/autobot-agentic-local-candidate.patch');
  fs.mkdirSync(path.dirname(patchPath),{recursive:true});
  let correctionAttempts = 0;
  let lastFailure = '';
  try {
    for (let attempt = 1; attempt <= maxRepairAttempts; attempt += 1) {
      const extra = lastFailure ? '\nCORRECTION ATTEMPT ' + attempt + ' OF ' + maxRepairAttempts + '. Previous candidate was rejected. Treat this exact failure as authoritative:\n' + lastFailure + '\nFix the failure and do not repeat the rejected construct.' : '';
      const raw = await ask(prompt(extra));
      fs.writeFileSync(path.join(root,'builder/working/autobot-agentic-local-model-output.txt'),raw);
      const replacement = extract(raw);
      if (!replacement) { lastFailure = 'model did not return a complete target file'; correctionAttempts += 1; continue; }
      fs.writeFileSync(candidate,replacement);
      const validation = await validate(candidate);
      if (typeof validation === 'string') {
        lastFailure = validation;
        correctionAttempts += 1;
        console.log('[autobot-targeted-local] candidate rejected on attempt ' + attempt + ': ' + validation);
        continue;
      }
      fs.writeFileSync(patchPath,validation.patch);
      for (const args of [['apply','--check',patchPath],['apply','--numstat',patchPath]]) { const r=git(...args); if(r.status!==0) throw new Error(r.stderr||r.stdout||'git validation failed'); }
      const stats=git('apply','--numstat',patchPath); if(!stats.stdout.trim()) throw new Error('controller-generated patch contains no effective line changes');
      const applied=git('apply','--whitespace=error',patchPath); if(applied.status!==0) throw new Error(applied.stderr||applied.stdout||'candidate patch failed to apply');
      const changed=codeChanges();
      const violations=changed.filter(x=>!allowed.has(x)); if(violations.length) throw new Error('applied candidate escaped scope: '+violations.join(', '));
      if(changed.length !== 1 || !changed.includes(target)) throw new Error('candidate changed paths outside the single allowed target');
      const finalSyntax=run('node',['--check',target]); if(finalSyntax.status!==0) throw new Error(finalSyntax.stderr||finalSyntax.stdout||'candidate failed final syntax check');
      const evidence={engine:'targeted-local-repair',protocol:'complete-file-replacement-controller-diff',model,apiBase,target,allowedPaths:[...allowed],baseSha,changedPaths:changed,maxOutputTokens,requestTimeoutMs,maxRepairAttempts,correctionAttempts,behavioralGate:target==='builder/runner/ollama-performance-proxy.mjs'?'health+hanging-upstream-bounded-timeout-502+post-timeout-health':'syntax-only',verified:true,provider:'local-only',hostedApiRequired:false,at:new Date().toISOString()};
      fs.writeFileSync(path.join(root,'builder/working/autobot-agentic-local-result.json'),JSON.stringify(evidence,null,2)+'\n');
      console.log(JSON.stringify(evidence,null,2));
      return;
    }
    throw new Error('no verified candidate after ' + maxRepairAttempts + ' repair attempts; last failure: ' + lastFailure);
  } catch(e) { rollback(initial); throw e; }
  finally { fs.rmSync(tempDir,{recursive:true,force:true}); }
}
main().catch(e=>{ console.error('[autobot-targeted-local] '+(e.stack||e.message)); process.exit(1); });
