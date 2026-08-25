import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const version = process.env.BUILDER_GEMINI_CLI_VERSION || '0.55.1';
const model = process.env.GEMINI_MODEL || 'flash-lite';

const cliArgs = [
  '--yes',
  `@google/gemini-cli@${version}`,
  '--skip-trust',
  '--approval-mode',
  'yolo',
  '--model',
  model,
  ...args,
];

const child = spawn('npx', cliArgs, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    GEMINI_CLI_TRUST_WORKSPACE: 'true',
  },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Gemini CLI launcher failed: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Gemini CLI terminated by signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
