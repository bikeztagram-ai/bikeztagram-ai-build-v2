#!/usr/bin/env node
/**
 * Gemini-free product-first objective selector.
 * Scores candidate objectives by demonstrated product impact and quality gaps.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const policyPath = path.join(root, 'builder', 'brain', 'product-priority-policy.json');
const evidencePath = path.join(root, 'builder', 'reports', 'self-improvement.json');
const roadmapPath = path.join(root, 'builder', 'working', 'roadmap.json');

const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const evidence = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, 'utf8')) : {};
const roadmap = fs.existsSync(roadmapPath) ? JSON.parse(fs.readFileSync(roadmapPath, 'utf8')) : { objectives: [] };

const categoryWeights = policy.categoryWeights || {
  render_quality: 100,
  director_intelligence: 95,
  storytelling: 90,
  audio: 80,
  mobile_ux: 75,
  reliability: 70,
  tooling: 30,
  housekeeping: 10
};

const keywords = {
  render_quality: /render|export|transition|motion|zoom|pan|ffmpeg|video/i,
  director_intelligence: /director|select|shot|brief|creative|intent|treatment|decision/i,
  storytelling: /story|narrative|hook|reveal|action|hero|pacing|continuity/i,
  audio: /audio|music|beat|sound|rhythm/i,
  mobile_ux: /mobile|android|pwa|touch|responsive|ux|ui/i,
  reliability: /error|failure|retry|timeout|validation|qa|test|regression/i,
  tooling: /workflow|autobot|telemetry|logging|observability/i,
  housekeeping: /docs|cleanup|refactor|chore/i
};

function category(text) {
  return Object.entries(keywords).find(([, rx]) => rx.test(text))?.[0] || 'housekeeping';
}
function score(objective) {
  const text = `${objective.id || ''} ${objective.title || ''} ${objective.description || ''}`;
  const cat = category(text);
  let score = categoryWeights[cat] || 0;
  if (/no.?op|duplicate|placeholder|cosmetic/i.test(text)) score -= 80;
  if (objective.verified === true) score -= 100;
  if (objective.blocked === true) score -= 50;
  if (evidence.lowProductionYield || evidence.highNoOpRate) score += cat === 'tooling' ? 5 : 15;
  return { ...objective, category: cat, priorityScore: score };
}

const candidates = (roadmap.objectives || [])
  .filter(o => o.status === 'queued' || o.status === 'ready')
  .map(score)
  .sort((a, b) => b.priorityScore - a.priorityScore || String(a.id).localeCompare(String(b.id)));

const result = {
  generatedAt: new Date().toISOString(),
  provider: 'deterministic-local',
  policyVersion: policy.version || 1,
  selected: candidates[0] || null,
  candidates: candidates.slice(0, 10)
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
