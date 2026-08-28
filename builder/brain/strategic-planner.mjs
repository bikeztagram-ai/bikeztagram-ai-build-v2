#!/usr/bin/env node
/**
 * Gemini-free strategic planner.
 *
 * This is deliberately local and deterministic: it does not call an external
 * model or provider. It turns durable project evidence into a bounded next-step
 * plan, and can replenish the roadmap when the static queue is exhausted.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const brain = path.join(root, 'builder', 'brain');
const working = path.join(root, 'builder', 'working');
const roadmapPath = path.join(brain, 'roadmap.json');
const libraryPath = path.join(brain, 'task-library.json');
const evidencePath = path.join(working, 'deterministic-autobot-evidence.json');
const checkpointPath = path.join(working, 'deterministic-autobot.json');
const policyPath = path.join(brain, 'priority-policy.json');
const planPath = path.join(working, 'strategic-plan.json');

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
};

const roadmap = readJson(roadmapPath, { version: 2, objectives: [] });
const library = readJson(libraryPath, { version: 1, tasks: [] });
const evidence = readJson(evidencePath, { units: [] });
const checkpoint = readJson(checkpointPath, { history: { tasks: [], objectives: [] } });
const policy = readJson(policyPath, { objectiveWeights: {} });

const historyTasks = new Set(checkpoint.history?.tasks || []);
const historyObjectives = new Set(checkpoint.history?.objectives || []);
const failedUnits = (evidence.units || []).filter(unit => unit.error);
const noOpUnits = (evidence.units || []).filter(unit => unit.unchangedButVerified);
const queued = roadmap.objectives.filter(objective => objective.status === 'queued');
const activeQueueIds = new Set(queued.map(objective => objective.id));

const candidateCatalog = [
  {
    id: 'autobot-repo-intelligence',
    title: 'Autonomous repository intelligence',
    priority: 1,
    acceptance: [
      'inventory application entry points and production boundaries',
      'identify stale or duplicate AutoBot work before planning',
      'emit auditable dependency and impact notes'
    ],
    tasks: [
      {
        id: 'autobot-repo-intelligence-contract',
        kind: 'builder-intelligence',
        goal: 'Build a deterministic repository inventory and impact map for future AutoBot decisions.',
        files: ['builder/brain'],
        implementation: ['node scripts/autobot/strategic-repo-intelligence-runtime.mjs'],
        verify: ['node scripts/autobot/strategic-repo-intelligence-contract-check.mjs']
      }
    ]
  },
  {
    id: 'autobot-quality-feedback-loop',
    title: 'Autonomous quality feedback loop',
    priority: 2,
    acceptance: [
      'convert verification and quality evidence into explicit improvement candidates',
      'prioritise production-impacting weaknesses over marker-only work',
      'retain before/after evidence for every improvement cycle'
    ],
    tasks: [
      {
        id: 'autobot-quality-feedback-contract',
        kind: 'builder-intelligence',
        goal: 'Create a deterministic quality-feedback contract that ranks real production weaknesses ahead of no-op work.',
        files: ['builder/brain'],
        implementation: ['node scripts/autobot/quality-feedback-runtime.mjs'],
        verify: ['node scripts/autobot/quality-feedback-contract-check.mjs']
      }
    ]
  },
  {
    id: 'autobot-pr-quality-gate',
    title: 'Autonomous PR quality gate',
    priority: 3,
    acceptance: [
      'reject empty or marker-only production changes',
      'require build and relevant verification evidence',
      'require a concise explanation of user-facing impact'
    ],
    tasks: [
      {
        id: 'autobot-pr-quality-gate-contract',
        kind: 'builder-safety',
        goal: 'Add a deterministic pre-PR quality contract that rejects no-op or weakly evidenced work.',
        files: ['builder/brain'],
        implementation: ['node scripts/autobot/pr-quality-gate-runtime.mjs'],
        verify: ['node scripts/autobot/pr-quality-gate-contract-check.mjs']
      }
    ]
  }
];

function dependencySatisfied(objective) {
  return (objective.dependsOn || []).every(dep =>
    roadmap.objectives.some(item => item.id === dep && item.status === 'complete') || historyObjectives.has(dep)
  );
}

function scoreCandidate(candidate) {
  let score = 100 - candidate.priority * 5;
  if (failedUnits.length) score += 20;
  if (noOpUnits.length) score += 15;
  if (!queued.length) score += 40;
  const weight = policy.objectiveWeights?.['builder-intelligence'] || 1;
  score += Math.round(weight * 5);
  return score;
}

const existingTaskIds = new Set(library.tasks.map(task => task.id));
let selected = null;
for (const candidate of candidateCatalog.sort((a, b) => scoreCandidate(b) - scoreCandidate(a))) {
  if (activeQueueIds.has(candidate.id)) continue;
  if (candidate.tasks.some(task => existingTaskIds.has(task.id))) continue;
  selected = candidate;
  break;
}

const reasons = [];
if (failedUnits.length) reasons.push(`${failedUnits.length} failed unit(s) in durable evidence`);
if (noOpUnits.length) reasons.push(`${noOpUnits.length} verified no-op unit(s) detected`);
if (!queued.length) reasons.push('roadmap has no queued objectives');
if (!reasons.length) reasons.push('strategic planning pass requested');

const plan = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode: 'deterministic-strategic-planner',
  externalAi: false,
  selectedObjectiveId: selected?.id || null,
  reasons,
  evidence: {
    failedUnits: failedUnits.length,
    noOpUnits: noOpUnits.length,
    queuedObjectives: queued.length
  },
  action: selected ? 'replenish-roadmap' : 'no-new-objective',
  guardrails: [
    'never modify protected renderer or deployment infrastructure',
    'never call Gemini or another external AI provider',
    'never count unchanged verification as new production work',
    'never create duplicate objective or task ids'
  ]
};

if (selected) {
  roadmap.objectives.push({
    id: selected.id,
    priority: 8 + selected.priority,
    status: 'queued',
    title: selected.title,
    queueBatch: `generated-${selected.id}`,
    generated: true,
    dependsOn: [],
    acceptance: selected.acceptance
  });
  for (const task of selected.tasks) {
    library.tasks.push({
      ...task,
      objectiveId: selected.id,
      status: 'ready',
      acceptance: selected.acceptance,
      protected: ['.github/workflows/**', 'builder/runner/**', 'builder/quality/**', 'config/autonomous-builder-queue.json', 'src/renderer.js']
    });
  }
  writeJson(roadmapPath, roadmap);
  writeJson(libraryPath, library);
}

writeJson(planPath, plan);
console.log(`[autobot] strategic planner: ${plan.action}; objective=${plan.selectedObjectiveId || 'none'}; failures=${failedUnits.length}; noOps=${noOpUnits.length}; queued=${queued.length}`);
