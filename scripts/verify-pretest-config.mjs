import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
if (config?.git?.deploymentEnabled !== false) {
  throw new Error('Automatic Vercel Git deployments must remain disabled during development');
}
if (!Array.isArray(config.rewrites)) {
  throw new Error('Expected existing Vercel rewrite configuration to remain present');
}
console.log('pretest-config: PASS');
