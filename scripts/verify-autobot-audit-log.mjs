#!/usr/bin/env node
/** Contract test for AutoBot's tamper-evident audit trail. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const modulePath = path.join(root, 'builder', 'quality', 'audit-log.mjs');
if (!fs.existsSync(modulePath)) throw new Error('audit-log.mjs is missing');
const source = fs.readFileSync(modulePath, 'utf8');
for (const token of ['sha256', 'previousHash', 'verifyAuditLog', 'appendAudit']) {
  if (!source.includes(token)) throw new Error(`audit contract missing ${token}`);
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bikeztagram-audit-'));
try {
  const script = `import fs from 'node:fs';\nimport path from 'node:path';\nimport { appendAudit, verifyAuditLog } from ${JSON.stringify(modulePath)};\nconst p=path.join(process.cwd(),'builder','working');\nfs.mkdirSync(p,{recursive:true});\nappendAudit('test-start',{safe:true});\nappendAudit('test-finished',{verified:true});\nconst r=verifyAuditLog();\nif(!r.valid||r.checked!==2) throw new Error(JSON.stringify(r));\n`;
  execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: temp,
    env: { ...process.env, GITHUB_RUN_ID: 'audit-contract-test' },
    stdio: 'pipe',
  });
  console.log('AutoBot audit-log contract: PASS');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
