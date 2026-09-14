#!/usr/bin/env node
/** Independent behavioural verifier for the targeted self-evolution proxy. */
import { spawn } from 'node:child_process';
import http from 'node:http';

const root = process.cwd();
const target = process.env.AUTOBOT_LOCAL_TARGET || 'builder/runner/ollama-performance-proxy.mjs';
if (target !== 'builder/runner/ollama-performance-proxy.mjs') { console.log('No behavioural verifier required for target: ' + target); process.exit(0); }
const port = 20500 + Math.floor(Math.random() * 1000);
const upstreamPort = port + 1000;
const upstream = http.createServer((req, res) => { if (req.url === '/api/chat') return; res.writeHead(404); res.end(); });
const child = spawn(process.execPath, [target], { cwd: root, env: { ...process.env, OLLAMA_PROXY_PORT: String(port), OLLAMA_UPSTREAM: 'http://127.0.0.1:' + upstreamPort }, stdio: ['ignore','pipe','pipe'] });
let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });
function stop() { if (child.exitCode === null) child.kill('SIGTERM'); }
async function waitForHealth() { for (let i=0;i<50;i+=1) { if (child.exitCode !== null) return false; try { const r=await fetch('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(300)}); if(r.ok&&(await r.text()).trim()==='ok') return true; } catch {} await new Promise(r=>setTimeout(r,100)); } return false; }
try {
  await new Promise((resolve,reject)=>{upstream.once('error',reject);upstream.listen(upstreamPort,'127.0.0.1',resolve);});
  if (!(await waitForHealth())) throw new Error('proxy failed initial /health check; output: '+output.slice(-3000));
  const started=Date.now();
  let response;
  try { response=await fetch('http://127.0.0.1:'+port+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'test',messages:[{role:'user',content:'test'}]}),signal:AbortSignal.timeout(13000)}); }
  catch(e) { throw new Error('proxy request did not return a response within 13s: '+e.message+'; output: '+output.slice(-3000)); }
  const elapsed=Date.now()-started;
  if(response.status!==502) throw new Error('expected 502 from hanging upstream, received '+response.status+' after '+elapsed+'ms; output: '+output.slice(-3000));
  if(elapsed>12500) throw new Error('proxy timeout was too slow: '+elapsed+'ms');
  const after=await fetch('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(500)});
  if(!after.ok||(await after.text()).trim()!=='ok') throw new Error('proxy became unhealthy after upstream timeout');
  console.log(JSON.stringify({ok:true,target,checks:['initial-health','hanging-upstream-502-within-12.5s','post-timeout-health'],elapsedMs:elapsed}));
} finally {
  stop();
  await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL');resolve();},1000);});
  upstream.close();
}
