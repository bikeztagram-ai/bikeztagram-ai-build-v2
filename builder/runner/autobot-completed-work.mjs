#!/usr/bin/env node
/**
 * Build the single auditable AutoBot completed-work inbox from isolated worker artifacts.
 *
 * This file is a manifest only: source code remains isolated in worker branches.
 * Only a verified specialist handoff is allowed into candidates[]. Failed workers are
 * preserved as failures[] so the orchestration/recovery layer can route repairable work.
 */
import fs from 'node:fs';
import path from 'node:path';

export const COMPLETED_WORK_SCHEMA='autobot-completed-work-v1';
export const DEFAULT_OUTPUT='builder/working/autobot-completed-work.json';

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function walk(dir){
  if(!fs.existsSync(dir))return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
function filesMatching(root,name){return walk(root).filter(file=>path.basename(file)===name);}
function unique(values){return [...new Set(values.filter(Boolean))];}

export function buildCompletedWork({inputRoot='builder/working/specialist-results',outputPath=process.env.AUTOBOT_COMPLETED_WORK_PATH||path.join(process.cwd(),DEFAULT_OUTPUT),runId=process.env.GITHUB_RUN_ID||'local'}={}){
  const handoffFiles=filesMatching(inputRoot,'autobot-specialist-handoff.json');
  const outcomeFiles=filesMatching(inputRoot,'autobot-specialist-outcome.json');
  const candidates=[];
  const failures=[];
  const seenBots=new Set();

  for(const file of handoffFiles){
    try{
      const handoff=readJson(file);
      if(handoff.schemaVersion!== 'autobot-specialist-handoff-v1' || handoff.status!=='verified-candidate') continue;
      if(seenBots.has(handoff.botId)) throw new Error(`duplicate verified candidate for ${handoff.botId}`);
      seenBots.add(handoff.botId);
      candidates.push({
        id:`${handoff.botId}-${handoff.candidateCommit.slice(0,12)}`,
        botId:handoff.botId,
        objective:handoff.objective,
        status:'ready-for-review',
        baseCommit:handoff.baseCommit,
        candidateCommit:handoff.candidateCommit,
        branch:handoff.branch,
        files:unique(handoff.ownsFiles),
        productQualityCheck:handoff.productQualityCheck,
        downstream:handoff.downstream,
        sourceArtifact:file
      });
    }catch(error){
      failures.push({kind:'invalid-handoff',sourceArtifact:file,error:error.message,repairable:false});
    }
  }

  for(const file of outcomeFiles){
    try{
      const outcome=readJson(file);
      if(outcome.status==='success') continue;
      const botId=String(outcome.botId||path.basename(path.dirname(file))).trim();
      if(candidates.some(item=>item.botId===botId)) continue;
      failures.push({
        id:`${botId}-${runId}`,
        kind:outcome.category||'specialist-builder-failure',
        botId,
        objective:outcome.objective||null,
        status:'needs-routing',
        repairable:outcome.repairable===true,
        error:outcome.error||'specialist Builder failed without a recorded error',
        files:Array.isArray(outcome.files)?unique(outcome.files):[],
        baseCommit:outcome.baseCommit||null,
        evidence:outcome.evidence||[],
        sourceArtifact:file
      });
    }catch(error){
      failures.push({kind:'invalid-outcome',sourceArtifact:file,error:error.message,repairable:false});
    }
  }

  const status=candidates.length?'ready-for-review':failures.length?'needs-recovery':'no-worker-output';
  const manifest={
    schemaVersion:COMPLETED_WORK_SCHEMA,
    runId:String(runId),
    generatedAt:new Date().toISOString(),
    status,
    summary:{candidateCount:candidates.length,failureCount:failures.length,repairableFailureCount:failures.filter(x=>x.repairable===true).length},
    candidates,
    failures,
    policy:{sourceChangesRemainIsolated:true,onlyVerifiedCandidatesEnterCandidates:true,automaticMerge:false,automaticPush:false,humanReviewRequired:true}
  };
  fs.mkdirSync(path.dirname(outputPath),{recursive:true});
  fs.writeFileSync(outputPath,JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const inputRoot=process.argv[2]||'builder/working/specialist-results';
  const manifest=buildCompletedWork({inputRoot});
  console.log(JSON.stringify(manifest,null,2));
  if(manifest.status==='no-worker-output')process.exitCode=2;
}
