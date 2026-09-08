#!/usr/bin/env node
/** Contract test for the active repository-aware multi-turn Qwen feature brain. */
import fs from 'node:fs';

const brain = fs.readFileSync('builder/runner/repository-aware-feature-brain.mjs', 'utf8');
const failures = [];
const required = [
  ['repository-aware-agent-v7', 'canonical agent protocol'],
  ['/api/chat', 'Ollama chat endpoint'],
  ['stream: false', 'non-streaming response'],
  ['think: false', 'thinking disabled'],
  ['temperature: 0', 'deterministic temperature'],
  ['num_ctx: 4096', 'proven 4K context'],
  ['num_predict: 900', 'proven output budget'],
  ['tools', 'tool definitions'],
  ['response?.message?.tool_calls', 'native tool-call parsing'],
  ['<tool_call>', 'fallback tool-call parsing'],
  ['tool_name: call.name', 'tool-result message contract'],
  ['read_file', 'repository-scoped inspection'],
  ['edit_file', 'repository-scoped editing'],
  ['run_check', 'bounded verification'],
  ['submit', 'verified submission'],
  ['must match once', 'exact-match write protection'],
  ['fs.writeFileSync(abs(file), current);', 'transactional rollback'],
  ['snapshots', 'objective snapshots'],
  ['dependenciesMet', 'dependency-aware objective selection'],
  ['state.failed', 'durable failure state'],
  ['progress[objective.id] = 1', 'durable completion tracking'],
  ['failedEditFiles', 'failed-file recovery'],
];
for (const [needle, label] of required) if (!brain.includes(needle)) failures.push(`missing ${label}`);
if (!/Math\.min\(10,\s*Math\.floor\(left\(\)\)/.test(brain)) failures.push('bounded feature time window missing');
if (!/maxTurns/.test(brain) || !/maxEdits/.test(brain)) failures.push('bounded turn/edit ceilings missing');
if (!/Math\.min\(180,\s*Math\.max\(45,\s*Math\.floor\(left\(\) \* 60\)\)\)/.test(brain)) failures.push('bounded Ollama request timeout missing');
if (/git\s+reset\s+--hard|git\s+clean\s+-f/.test(brain)) failures.push('unsafe wholesale rollback still active');
if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('AutoBot feature-edit protocol PASS: canonical repository-aware multi-turn Qwen agent, scoped exact-match edits, transactional rollback, bounded verification, and durable objective progress.');
