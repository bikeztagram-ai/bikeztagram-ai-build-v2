#!/usr/bin/env node
/** Durable, explicit handoff contract from a Specialist Builder to Reviewer/QA. */
import fs from 'node:fs';
import path from 'node:path';

export const SPECIALIST_HANDOFF_SCHEMA='autobot-specialist-handoff-v1';
export const DEFAULT_SPECIALIST_HANDOFF_PATH='builder/working/autobot-specialist-handoff.json';

export function validateSpecialistHandoff(value){
  if(!value||value.schemaVersion!==SPECIALIST_HANDOFF_SCHEMA)throw new Error('invalid specialist handoff schema');
  for(const key of ['botId','objective','baseCommit','candidateCommit','branch','status'])if(typeof value[key]!=='string'||!value[key].trim())throw new Error(`specialist handoff missing ${key}`);
  if(!/^[0-9a-f]{40}$/i.test(value.baseCommit)||!/^[0-9a-f]{40}$/i.test(value.candidateCommit))throw new Error('specialist handoff commits must be 40-character hexadecimal SHAs');
  if(value.status!=='verified-candidate')throw new Error(`specialist handoff status is not verified-candidate: ${value.status}`);
  if(!Array.isArray(value.ownsFiles)||value.ownsFiles.length===0||value.ownsFiles.some(file=>typeof file!=='string'||!file.trim()))throw new Error('specialist handoff ownsFiles must be a non-empty string array');
  if(value.productQualityCheck!=='npm run verify:autobot-product-change-quality'&&typeof value.productQualityCheck!=='string')throw new Error('specialist handoff productQualityCheck must be explicit');
  if(value.downstream?.reviewContract!=='AUTOBOT_REVIEW_BASE_COMMIT + AUTOBOT_REVIEW_COMMIT')throw new Error('specialist handoff reviewer contract is missing');
  return value;
}

export function writeSpecialistHandoff(handoff, outputPath=process.env.AUTOBOT_SPECIALIST_HANDOFF_PATH||path.join(process.cwd(),DEFAULT_SPECIALIST_HANDOFF_PATH)){
  const validated=validateSpecialistHandoff(handoff);
  fs.mkdirSync(path.dirname(outputPath),{recursive:true});
  fs.writeFileSync(outputPath,JSON.stringify(validated,null,2)+'\n');
  return outputPath;
}

export function readSpecialistHandoff(inputPath=process.env.AUTOBOT_SPECIALIST_HANDOFF_PATH||path.join(process.cwd(),DEFAULT_SPECIALIST_HANDOFF_PATH)){
  return validateSpecialistHandoff(JSON.parse(fs.readFileSync(inputPath,'utf8')));
}
