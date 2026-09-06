#!/usr/bin/env node
/** Regression test: AutoBot audit history must detect record tampering. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const modulePath = path.join(root, 'builder', 'quality', 'audit-log.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bikeztagram-audit-tamper-'));
try {
  const script = `import fs from 'node:fs';\nimport path from 'node:path';\nimport { appendAudit, verifyAuditLog } from ${JSON.stringify(modulePath)};\nconst p=path.join(process.cwd(),'builder','working');\nfs.mkdirSync(p,{recursive:true});\nappendAudit('first',{value:1});\nappendAudit('second',{value:2});\nlet result=verifyAuditLog();\nif(!result.valid||result.checked!==2) throw new Error(JSON.stringify(result));\nconst log=path.join(p,'autobot-audit.jsonl');\nconst lines=fs.readFileSync(log,'utf8').trim().split('\\n');\nconst record=JSON.parse(lines[1]);\nrecord.details.value=999;\nlines[1]=JSON.stringify(record);\nfs.writeFileSync(log,lines.join('\\n')+'\\n');\nresult=verifyAuditLog();\nif(result.valid||!String(result.error).includes('audit integrity failure')) throw new Error('tampering was not detected');\n`;
  execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: temp,
    env: { ...process.env, GITHUB_RUN_ID: 'audit-tamper-test' },
    stdio: 'pipe',
  });
  console.log('AutoBot audit tamper detection: PASS');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
