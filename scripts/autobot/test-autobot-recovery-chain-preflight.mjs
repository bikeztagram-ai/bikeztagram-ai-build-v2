#!/usr/bin/env node
/** Verify the complete recovery chain is registered before activation. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const registry=JSON.parse(fs.readFileSync(path.join(root,'builder/brain/autobot-fleet.json'),'utf8'));
const expected=[
  ['repair','builder/runner/autobot-repair.mjs','repairOne'],
  ['qa','builder/runner/autobot-qa.mjs','qaOne'],
  ['reviewer','builder/runner/autobot-reviewer.mjs','reviewOne']
];
for(const [id,entrypoint,exportName] of expected){
  const worker=(registry.bots||[]).find(item=>item.id===id);
  if(!worker||worker.status!=='verified'||worker.protected===true||worker.entrypoint!==entrypoint)throw new Error(`Recovery chain registration mismatch for ${id}.`);
  if(!fs.existsSync(path.join(root,entrypoint)))throw new Error(`Registered ${id} entrypoint is missing: ${entrypoint}`);
  const module=await import(new URL(entrypoint,`file://${root}/`).href);
  if(typeof module[exportName]!=='function')throw new Error(`Registered ${id} entrypoint does not export ${exportName}.`);
}
if(registry.enabled!==false||registry.coordination?.mode!=='plan-only')throw new Error('Recovery chain preflight requires the fleet to remain disabled and plan-only.');
if(registry.activationGate?.protectedIntegration!==false)throw new Error('Recovery chain preflight requires protected integration to remain false.');
console.log(JSON.stringify({ok:true,chain:expected.map(([id])=>id),registered:true,exportsVerified:true,disabled:true,planOnly:true,protectedIntegration:false}));
