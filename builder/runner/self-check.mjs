import { readFile } from 'node:fs/promises';

const workflow = await readFile('.github/workflows/autonomous-builder.yml', 'utf8');
const runner = await readFile('builder/runner/index.mjs', 'utf8');
const batch = JSON.parse(await readFile('builder/batch-77.json', 'utf8'));

const checks = [
  ['workflow is manual-only', workflow.includes('workflow_dispatch:') && !workflow.includes('push:') && !workflow.includes('schedule:')],
  ['workflow has bounded job timeout', workflow.includes('timeout-minutes: 70')],
  ['runner hard-caps Sandbox at 60 minutes', runner.includes('Math.min(Number(process.env.BUILDER_MAX_MINUTES || 60), 60)')],
  ['runner creates ephemeral Sandbox', runner.includes('persistent: false')],
  ['runner always stops Sandbox', runner.includes('finally {') && runner.includes('await sandbox.stop()')],
  ['runner refuses main/master/production branches', runner.includes("value !== 'main'") && runner.includes("value !== 'master'") && runner.includes("!value.startsWith('production/')")],
  ['runner never auto-merges', runner.includes('autoMerge: false') && batch.autoMerge === false],
  ['runner never auto-deploys production', runner.includes('autoProductionDeploy: false') && batch.autoProductionDeploy === false],
  ['runner requires verification', runner.includes('VERIFY_COMMANDS') && runner.includes('Verification failed')],
  ['runner requires an explicit agent command', runner.includes('BUILDER_AGENT_CMD is required')],
  ['runner does not print the GitHub token in command output', !runner.includes('GITHUB_TOKEN`') || runner.includes('GIT_CONFIG_VALUE_0')],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
console.log('ALL_RUNNER_SELF_CHECKS_PASS');
