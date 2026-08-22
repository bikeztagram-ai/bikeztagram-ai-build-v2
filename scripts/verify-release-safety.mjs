import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
if (config?.git?.deploymentEnabled !== false) {
  throw new Error('Release safety failed: automatic Vercel Git deployments must remain disabled');
}
if (!Array.isArray(config.rewrites) || config.rewrites.length === 0) {
  throw new Error('Release safety failed: expected application rewrite configuration is missing');
}
console.log('release-safety: PASS');
