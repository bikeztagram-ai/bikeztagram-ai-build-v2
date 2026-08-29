import fs from 'node:fs/promises';

const repo = process.env.GITHUB_REPOSITORY || 'bikeztagram-ai/bikeztagram-ai-build-v2';
const token = process.env.GITHUB_TOKEN || process.env.BUILDER_GITHUB_TOKEN;
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';
const queuePath = 'config/autonomous-builder-queue.json';

if (!token) throw new Error('A GitHub token is required to inspect autonomous-builder state.');
const queue = JSON.parse(await fs.readFile(queuePath, 'utf8'));
if (!Array.isArray(queue.batches) || !queue.batches.length) throw new Error('Autonomous builder queue is empty or invalid.');
async function api(path, options = {}) { const response = await fetch(`${apiBase}${path}`, { ...options, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2026-03-10', ...(options.headers || {}) } }); if (!response.ok) { const text = await response.text(); const error = new Error(`GitHub API ${response.status} for ${path}: ${text}`); error.status = response.status; throw error; } return response.status === 204 ? null : response.json(); }
const [owner, name] = repo.split('/');
async function pullRequestsFor(branch) { return api(`/repos/${owner}/${name}/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=20`); }
async function getBranch(branch) { try { return await api(`/repos/${owner}/${name}/git/ref/heads/${encodeURIComponent(branch)}`); } catch (error) { if (error.status === 404) return null; throw error; } }
async function getCommit(sha) { return api(`/repos/${owner}/${name}/commits/${sha}`); }
async function deleteStaleBranch(branch) { await api(`/repos/${owner}/${name}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'DELETE' }); console.log(`Deleted stale builder branch ${branch}.`); }
function safe(value) { return String(value ?? '').replace(/[\r\n|]/g, ' ').trim(); }
function statusFor(batch, prs, ref) { const merged=prs.find(pr=>pr.merged_at); const open=prs.find(pr=>pr.state==='open'); const closed=prs.find(pr=>pr.state==='closed'&&!pr.merged_at); if(merged)return `MERGED (#${merged.number})`; if(open)return `REVIEW QUEUED (#${open.number})`; if(batch.status==='rejected'||batch.status==='skipped')return String(batch.status).toUpperCase(); if(closed)return `REVIEW NEEDED (#${closed.number})`; if(ref)return 'BRANCH READY / RESUME'; return 'READY'; }
async function collectQueueState() { return Promise.all(queue.batches.map(async batch=>{const branch=`autonomous-builder/${batch.id}`;const [prs,ref]=await Promise.all([pullRequestsFor(branch),getBranch(branch)]);return {batch,branch,prs,ref,status:statusFor(batch,prs,ref)};})); }
async function appendQueueDashboard(states) { const lines=['## 🤖 Autonomous Builder — Live Queue','',`**Current:** ${states.find(({status})=>status==='READY'||status==='BRANCH READY / RESUME')?.batch?.id||'No ready batch'}`,'','| Batch | Objective | Status |','|---|---|---|',...states.map(({batch,status})=>`| \`${batch.id}\` | ${safe(batch.title)} | **${safe(status)}** |`),'']; await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`${lines.join('\n')}\n`); }
async function markNoWork(reason){const r=safe(reason);await fs.appendFile(process.env.GITHUB_ENV,`BUILDER_NO_WORK=true\nBUILDER_NO_WORK_REASON=${r}\n`);await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`### Queue selection\n\n**Status:** 💤 IDLE\n\n**Reason:** ${r}\n`);console.log(`Autonomous builder idle: ${r}`);}
const states=await collectQueueState();
await appendQueueDashboard(states);
for(const {batch,branch,prs} of states){
 const ref=await getBranch(branch); const merged=prs.find(pr=>pr.merged_at); const open=prs.find(pr=>pr.state==='open'); const closed=prs.find(pr=>pr.state==='closed'&&!pr.merged_at);
 if(merged){console.log(`${batch.id}: already merged; advancing queue.`);continue;}
 if(open){console.log(`${batch.id}: review PR #${open.number} queued; advancing without touching it.`);continue;}
 if(batch.status==='rejected'||batch.status==='skipped'){console.log(`${batch.id}: ${batch.status}; advancing queue.`);continue;}
 if(closed){console.log(`${batch.id}: closed unmerged PR retained as history; advancing queue.`);continue;}
 let resumeExisting=false;
 if(ref){const commit=await getCommit(ref.object.sha);const subject=String(commit.commit?.message||'').split('\n')[0];if(subject===`builder: complete ${batch.id}`)resumeExisting=true;else{console.log(`${batch.id}: partial branch without active PR; deleting stale branch.`);await deleteStaleBranch(branch);}}
 const env=[`BUILDER_BATCH_ID=${batch.id}`,`BUILDER_WORKING_BRANCH=${branch}`,`BUILDER_RESUME_EXISTING=${resumeExisting?'true':'false'}`,`BUILDER_OBJECTIVE<<__AUTONOMOUS_BUILDER_OBJECTIVE__`,batch.objective,`__AUTONOMOUS_BUILDER_OBJECTIVE__`].join('\n');
 await fs.appendFile(process.env.GITHUB_ENV,`${env}\n`); await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`### Queue selection\n\n**Selected:** ${batch.id} — ${batch.title}\n\n**Mode:** ${resumeExisting?'Resume':'New'}\n\n**Provider:** local Ollama only.\n`); console.log(`Selected ${batch.id}: ${batch.title}`); process.exit(0);
}
await markNoWork('No queued batch is ready.'); process.exit(0);