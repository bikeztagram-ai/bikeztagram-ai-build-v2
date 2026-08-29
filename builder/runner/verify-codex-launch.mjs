import { execFileSync } from 'node:child_process';
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for the AI engineering layer');
execFileSync('node', ['--check', 'builder/runner/ai-long-run.mjs'], { stdio: 'inherit' });
console.log('Codex launch contract OK');
