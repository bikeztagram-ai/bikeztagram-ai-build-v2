import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const runId = process.env.WORKFLOW_RUN_ID || '';
const repo = process.env.GITHUB_REPOSITORY || '';
const branch = process.env.GITHUB_REF_NAME || 'ai-director-two-stage';
const maxIterations = Number(process.env.MAX_AUTO_ITERATIONS || 1);
const remainingActions = Number(process.env.AUTO_REMAINING_ACTIONS || 0);
const iteration = Number(process.env.AUTO_ITERATION || 0);
const nextRemainingActions = Math.max(0, remainingActions - 1);
const allowed = ['src/aiEditPlanner.js','src/timelineDirector.js','src/editCritic.js','src/renderer.js','src/qa.js','src/styles.css'];
if (!apiKey) { console.log('AUTONOMOUS IMPROVER: GEMINI_API_KEY is not configured; leaving code unchanged.'); process.exit(0); }
if (iteration >= maxIterations) { console.log(`AUTONOMOUS IMPROVER: iteration limit ${maxIterations} reached.`); process.exit(0); }
if (remainingActions <= 0) { console.log('AUTONOMOUS IMPROVER: no autonomous actions remain in this batch.'); process.exit(0); }
function sh(command, args = []) { return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
function read(path) { return fs.readFileSync(path, 'utf8'); }
let testContext = 'No test run context was supplied.';
if (runId && repo) {
  try {
    const jobs = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`, { headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${process.env.GITHUB_TOKEN}` } });
    const data = await jobs.json();
    testContext = JSON.stringify(data.jobs?.map(j => ({ name: j.name, conclusion: j.conclusion, steps: j.steps?.map(s => ({ name: s.name, conclusion: s.conclusion })) })) || data).slice(0, 18000);
  } catch (error) { testContext = `Could not read workflow metadata: ${error.message}`; }
}
const files = Object.fromEntries(allowed.filter(fs.existsSync).map(path => [path, read(path)]));
const prompt = `You are the guarded autonomous engineering agent for Bikeztagram AI.
Goal: make the motorcycle video editor progressively more professional while preserving the proven upload/Gemini foundation.

HARD SAFETY RULES:
- You may ONLY modify these files: ${allowed.join(', ')}.
- Never modify App.jsx, any Blob/upload/client-upload/API route, package dependencies, workflows, secrets, or configuration.
- Never add generated-world scenes to normal real-footage mode.
- Prefer real uploaded footage, intelligent ordering, trimming, subtle reframing, motion, speed ramps, transitions and colour treatment.
- Make ONE small, coherent improvement only.
- Do not change behaviour merely to make a test pass.
- If the evidence does not justify a change, return an empty changes array.

Current autonomous action: ${iteration + 1} of ${remainingActions} remaining in this batch.
Test context:
${testContext}

Current allowed source files:
${JSON.stringify(files)}

Return JSON only with this exact shape:
{"summary":"short reason","changes":[{"path":"src/file.js","content":"complete replacement file contents"}]}
The changes array may contain zero or one item. Do not return patches or markdown.`;
const schema = { type: 'OBJECT', properties: { summary: { type: 'STRING' }, changes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { path: { type: 'STRING', enum: allowed }, content: { type: 'STRING' } }, required: ['path', 'content'] } } }, required: ['summary', 'changes'] };
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.15 } }) });
if (!response.ok) throw new Error(`Gemini improver failed: ${response.status} ${await response.text()}`);
const body = await response.json();
const text = body.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '{}';
const plan = JSON.parse(text);
const changes = Array.isArray(plan.changes) ? Object.fromEntries(plan.changes.map(change => [change.path, change.content])) : {};
const keys = Object.keys(changes);
if (keys.length === 0) { console.log(`AUTONOMOUS IMPROVER: no justified change. ${plan.summary || ''}`); process.exit(0); }
if (keys.length > 1 || !keys.every(path => allowed.includes(path))) throw new Error('Autonomous improver proposed an unsafe file set.');
for (const [path, content] of Object.entries(changes)) fs.writeFileSync(path, content);
try { sh('npm', ['run', 'build']); } catch (error) { console.error('AUTONOMOUS IMPROVER: build failed; reverting change.'); sh('git', ['restore', '--', ...keys]); process.exit(1); }
const status = sh('git', ['status', '--short']).trim();
if (!status) { console.log('AUTONOMOUS IMPROVER: no effective diff.'); process.exit(0); }
sh('git', ['config', 'user.name', 'Bikeztagram Autonomous Improver']);
sh('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
sh('git', ['add', ...keys]);
sh('git', ['commit', '-m', `[auto-improve remaining=${nextRemainingActions}] ${String(plan.summary || 'guarded improvement').slice(0, 120)}`]);
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required to push an autonomous improvement.');
const remote = `https://x-access-token:${token}@github.com/${repo}.git`;
sh('git', ['remote', 'set-url', 'origin', remote]);
sh('git', ['push', 'origin', branch]);
console.log(`AUTONOMOUS IMPROVER: committed and pushed. ${plan.summary}. Remaining actions after this change: ${nextRemainingActions}.`);
