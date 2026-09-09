import fs from 'node:fs';

const requiredFiles = [
  'AGENTS.md',
  '.github/copilot-instructions.md',
  '.github/agents/bikeztagram-engineer.agent.md',
  '.github/workflows/copilot-setup-steps.yml',
];

const requiredText = [
  ['AGENTS.md', ['Inspect the repository', 'Never merge autonomously', 'Gemini-free', 'Do not weaken scope guards']],
  ['.github/copilot-instructions.md', ['Bikeztagram', 'Inspect', 'Verify', 'Never merge']],
  ['.github/agents/bikeztagram-engineer.agent.md', ['read', 'edit', 'search', 'terminal', 'Never merge']],
  ['.github/workflows/copilot-setup-steps.yml', ['copilot-setup-steps:', 'ubuntu-latest', 'node-version: 22', 'npm install', 'npm run build']],
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing cloud-agent foundation file: ${file}`);
}

for (const [file, needles] of requiredText) {
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.toLowerCase().includes(needle.toLowerCase())) {
      throw new Error(`Cloud-agent contract missing "${needle}" in ${file}`);
    }
  }
}

const workflow = fs.readFileSync('.github/workflows/copilot-setup-steps.yml', 'utf8');
if ((workflow.match(/^  copilot-setup-steps:/gm) ?? []).length !== 1) {
  throw new Error('Copilot setup workflow must define exactly one copilot-setup-steps job');
}
if (workflow.includes('node --check src/App.jsx')) {
  throw new Error('Copilot setup must not use node --check directly on JSX');
}

const instructions = fs.readFileSync('.github/copilot-instructions.md', 'utf8');
const agent = fs.readFileSync('.github/agents/bikeztagram-engineer.agent.md', 'utf8');
const combined = `${instructions}\n${agent}\n${fs.readFileSync('AGENTS.md', 'utf8')}`.toLowerCase();
for (const forbidden of ['gemini api', 'openai api', 'paid ai provider']) {
  if (combined.includes(forbidden)) {
    throw new Error(`Cloud-agent instructions contain a forbidden product-runtime provider reference: ${forbidden}`);
  }
}

console.log('Cloud-agent foundation contract: PASS');
