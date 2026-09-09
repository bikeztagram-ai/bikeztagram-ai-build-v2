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

// Product runtime must remain provider-neutral and Gemini-free. The agent's
// instructions may mention forbidden providers precisely to prevent them from
// being introduced, so scan product source rather than agent prose.
const productFiles = [
  'src/App.jsx',
  'src/director.js',
  'src/renderer.js',
  'src/main.jsx',
  'src/musicProvider.js',
];
const forbiddenRuntimePatterns = [/@google\/genai/i, /gemini(?:\s|-)?api/i];
for (const file of productFiles) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of forbiddenRuntimePatterns) {
    if (pattern.test(text)) throw new Error(`Forbidden AI provider reference in product runtime: ${file}`);
  }
}

console.log('Cloud-agent foundation contract: PASS');
