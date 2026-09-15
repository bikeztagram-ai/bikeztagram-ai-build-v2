#!/usr/bin/env node
/** Build the single auditable completed-work inbox from isolated worker artifacts. */
import fs from 'node:fs';
import path from 'node:path';

export const COMPLETED_WORK_SCHEMA='autobot-completed-work-v1';
export const DEFAULT_OUTPUT='builder/working/autobot-completed-work.json';
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const walk=dir=>{if(!fs.existsSync(dir))return [];const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...walk(full));else out.push(full);}return out;};
const matching=(root,name)=>walk(root).filter(file=>path.basename(file)===name);
const unique=values=>[...new Set((values||[]).filter(Boolean))];

export function buildCompletedWork({inputRoot='builder/working/proven-results',outputPath=process.env.AUTOBOT_COMPLETED_WORK_PATH||path.join(process.cwd(),DEFAULT_OUTPUT),runId=process.env.GITHUB_RUN_ID||'local'}={}){
  const candidates=[]; const failures=[]; const seen=new Set();
  for(const file of matching(inputRoot,'autobot-proven-handoff.json')){
    try{
      const h=readJson(file);
      if(h.schemaVersion!=='autobot-proven-handoff-v1'||h.status!=='verified-candidate')continue;
      if(!h.candidateCommit||!h.baseCommit)throw new Error('verified proven handoff is missing base/candidate commit');
      const id=`${h.workerId||h.botId||'worker'}-${h.candidateCommit.slice(0,12)}`;
      if(seen.has(id))throw new Error(`duplicate verified candidate ${id}`); seen.add(id);
      candidates.push({id,botId:h.workerId||h.botId,objective:h.objective||null,status:'ready-for-review',baseCommit:h.baseCommit,candidateCommit:h.candidateCommit,branch:h.branch||null,files:unique(h.files||h.ownsFiles),productQualityCheck:h.productQualityCheck||'npm run verify:autobot-production-gate',downstream:h.downstream||null,sourceArtifact:file,verificationSource:'proven-long-run-worker'});
    }catch(error){failures.push({kind:'invalid-proven-handoff',sourceArtifact:file,error:error.message,repairable:false});}
  }
  for(const file of matching(inputRoot,'autobot-verified-candidate.json')){
    try{
      const h=readJson(file);
      if(h.status!=='integration-eligible'||h.eligible!==true)continue;
      const id=`repair-${h.failureId||h.candidateCommit?.slice(0,12)||'unknown'}`;
      if(seen.has(id))continue; seen.add(id);
      candidates.push({id,botId:`repair:${h.failureId||'unknown'}`,objective:h.objective||null,status:'ready-for-review',baseCommit:h.baseCommit,candidateCommit:h.candidateCommit,branch:h.branch||null,files:unique(h.changedFiles),productQualityCheck:h.productQualityCheck||'npm run verify:autobot-product-change-quality',downstream:h.downstream||{reviewStatus:'pass'},sourceArtifact:file,verificationSource:'repair-qa-review'});
    }catch(error){failures.push({kind:'invalid-verified-candidate',sourceArtifact:file,error:error.message,repairable:false});}
  }
  for(const file of matching(inputRoot,'autobot-proven-worker-outcome.json')){
    try{
      const o=readJson(file); if(o.status==='success')continue;
      failures.push({id:`${o.workerId||'worker'}-${runId}`,kind:o.category||'proven-worker-failure',botId:o.workerId||null,objective:o.objective||null,status:'needs-routing',repairable:o.repairable===true,error:o.error||'proven worker failed without a recorded error',files:unique(o.files),baseCommit:o.baseCommit||null,patchPath:o.patchPath||null,evidence:o.evidence||[],sourceArtifact:file});
    }catch(error){failures.push({kind:'invalid-worker-outcome',sourceArtifact:file,error:error.message,repairable:false});}
  }
  const status=candidates.length?'ready-for-review':failures.length?'needs-recovery':'no-worker-output';
  const manifest={schemaVersion:COMPLETED_WORK_SCHEMA,runId:String(runId),generatedAt:new Date().toISOString(),status,summary:{candidateCount:candidates.length,failureCount:failures.length,repairableFailureCount:failures.filter(x=>x.repairable===true).length},candidates,failures,policy:{sourceChangesRemainIsolated:true,onlyVerifiedCandidatesEnterCandidates:true,automaticMerge:false,automaticPush:false,humanReviewRequired:true}};
  fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,JSON.stringify(manifest,null,2)+'\n');return manifest;
}

if(import.meta.url===`file://${process.argv[1]}`){const manifest=buildCompletedWork({inputRoot:process.argv[2]||'builder/working/proven-results'});console.log(JSON.stringify(manifest,null,2));if(manifest.status==='no-worker-output')process.exitCode=2;}
