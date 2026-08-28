#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const brainDir = path.join(root, 'builder', 'brain');
const read = file => { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } };
const clip = (text, max = 18000) => text.length > max ? `${text.slice(0, max)}\n[truncated]` : text;

const key = process.env.GEMINI_API_KEY;
const model = process.env.AUTOBOT_AI_MODEL || 'gemini-3.7-flash';
const output = path.join(brainDir, 'ai-engineering-plan.json');

const deterministicFallback = {
  schemaVersion: 1,
  source: 'deterministic-fallback',
  model: null,
  generatedAt: new Date().toISOString(),
  priorities: [
    { id: 'quality-loop-integration', priority: 100, objective: 'Integrate cinematic quality evaluation into director iteration so weak plans are automatically improved before review.', rationale: 'Quality scoring exists but must drive corrective action.' },
    { id: 'autobot-continuation', priority: 95, objective: 'Make the builder replenish actionable production work when the current queue is exhausted.', rationale: 'Short runs must not stop merely because the initial queue is satisfied.' },
    { id: 'real-output-verification', priority: 90, objective: 'Add repeatable real-output acceptance evidence for rendered cinematic edits.', rationale: 'Passing contracts is not proof that the finished film is good.' }
  ],
  blockers: [],
  guardrails: ['Do not modify protected workflow/runner paths unless the objective explicitly requires it.', 'Never treat verification-only work as production progress.', 'Preserve the known-good main baseline.']
};

function write(plan) {
  fs.mkdirSync(brainDir, { recursive: true });
  fs.writeFileSync(output, JSON.stringify(plan, null, 2) + '\n');
  console.log(`[autobot] AI engineering brain: ${plan.source}, ${plan.priorities?.length || 0} priorities.`);
}

if (!key) {
  write(deterministicFallback);
  process.exit(0);
}

const context = {
  projectState: clip(read(path.join(brainDir, 'project-state.md'))),
  autonomousSystem: clip(read(path.join(brainDir, 'autonomous-engineering-system.md'))),
  roadmap: clip(read(path.join(brainDir, 'roadmap.json'))),
  taskLibrary: clip(read(path.join(brainDir, 'task-library.json')), 22000),
  selfImprovement: clip(read(path.join(brainDir, 'self-improvement-report.json'))),
  priorityPolicy: clip(read(path.join(brainDir, 'priority-policy.json'))),
  lessons: clip(read(path.join(brainDir, 'lessons.md')))
};

const prompt = `You are the lead AI engineering brain for Bikeztagram AI. Your job is to decide what the autonomous engineering system should build next. Think like a senior staff engineer, product architect, QA lead and cinematic-product director together.\n\nBikeztagram is an AI cinematic video editor/director. It must turn creator media and natural-language briefs into strong finished social videos, not merely valid JSON or green builds. It must remain copyright-safe, mobile-friendly and reliable.\n\nUse the supplied project context. Do not invent files, capabilities or completed work. Identify the highest-value unfinished work, detect stale/no-op patterns, and propose concrete implementation objectives. Prefer a small number of high-leverage objectives over a long generic list.\n\nReturn ONLY valid JSON with this shape:\n{\n  "schemaVersion": 1,\n  "source": "gemini",\n  "model": "${model}",\n  "summary": "...",\n  "priorities": [{"id":"stable-kebab-id","priority":0,"objective":"specific buildable objective","rationale":"why now","acceptance":["observable acceptance criterion"],"likelyFiles":["path"],"risk":"low|medium|high"}],\n  "blockers": [{"id":"...","description":"...","severity":"low|medium|high"}],\n  "guardrails":["..."],\n  "nextQuestion":"one question the builder should answer while executing"\n}\n\nRules: priority 0-100; maximum 5 priorities; maximum 5 acceptance items each; never recommend deleting the working baseline; never recommend exposing secrets; do not recommend changing protected workflow permissions unless explicitly necessary.\n\nPROJECT CONTEXT:\n${JSON.stringify(context, null, 2)}`;

try {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ model, input: prompt, generation_config: { response_mime_type: 'application/json' } })
  });
  if (!response.ok) throw new Error(`Gemini brain HTTP ${response.status}`);
  const payload = await response.json();
  const text = payload.output_text || payload.output?.text || payload.outputs?.[0]?.text;
  if (!text) throw new Error('Gemini brain returned no text output');
  const plan = JSON.parse(text);
  if (!Array.isArray(plan.priorities) || plan.priorities.length === 0) throw new Error('AI brain returned no priorities');
  plan.schemaVersion = 1;
  plan.source = 'gemini';
  plan.model = model;
  plan.generatedAt = new Date().toISOString();
  write(plan);
} catch (error) {
  console.warn(`[autobot] AI brain unavailable: ${error.message}; using deterministic fallback.`);
  write({ ...deterministicFallback, source: 'deterministic-fallback-after-ai-error', error: String(error.message) });
}
