#!/usr/bin/env node
/**
 * Repository-aware local coding agent for Bikeztagram AI.
 * Broad reads, narrow writes, bounded verification, resumable objective progress.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { appendAudit } from '../quality/audit-log.mjs';

const root = process.cwd();
const minutes = Number(process.env.BUILDER_MAX_MINUTES || 15);
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const abs = (file) => path.join(root, file);
const model = process.env.LOCAL_AI_MODEL || 'qwen3:8b';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const maxEdits = Math.min(6, Math.max(1, Number(process.env.AUTOBOT_FEATURE_MAX_EDITS || 3)));
const maxTurns = Math.min(12, Math.max(4, Number(process.env.AUTOBOT_AGENT_TURNS || 10)));
const maxFeatures = Math.max(1, Number(process.env.AUTOBOT_FEATURE_PASSES || 1));
const maxAttempts = Math.max(1, Number(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || 2));
const PROTOCOL = 'repository-aware-agent-v5';

function run(command, args = [], options = {}) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', ...options });
}
function capture(command, args) { try { return run(command, args); } catch (error) { return [error.stdout, error.stderr, error.message].filter(Boolean).join('\n'); } }
function read(file) { try { return fs.readFileSync(abs(file), 'utf8'); } catch { return ''; } }
function isSensitive(file) { return /(^|\/)(\.env(?:\..*)?|.*(?:secret|credential|token|private).*|.*\.pem)$/i.test(file); }
const mapPath = abs('builder/working/repository-map.json');
if (!fs.existsSync(mapPath)) run(process.execPath, ['builder/runner/repository-index.mjs']);
const repo = JSON.parse(read('builder/working/repository-map.json'));
const objectives = JSON.parse(read('builder/brain/feature-objectives.json')).objectives || [];
const statePath = abs('builder/working/feature-brain-state.json');
let state = { completed: [], progress: {}, failed: {} };
try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
const progress = { ...(state.progress || {}) };
for (const id of state.completed || []) progress[id] = Math.max(progress[id] || 0, 1);
const attempts = new Map();
function saveState() { fs.mkdirSync(path.dirname(statePath), { recursive: true }); fs.writeFileSync(statePath, JSON.stringify({ version: 11, completed: [], progress, failed: state.failed || {}, updatedAt: new Date().toISOString() }, null, 2) + '\n'); }
function dependenciesMet(objective) { return (objective.dependsOn || []).every((dependency) => progress[dependency] > 0 || (state.completed || []).includes(dependency)); }
function chooseObjective() { const available = objectives.filter((objective) => dependenciesMet(objective) && (attempts.get(objective.id) || 0) < maxAttempts); available.sort((a,b) => { const score=(o)=>(o.priority||0)-(progress[o.id]||0)*12-(state.failed?.[o.id]?.attempts||0)*8; return score(b)-score(a); }); return available[0]||null; }
function allowedFile(file, objective) { return new Set(objective.files || []).has(file); }
function gitStatus() { return capture('git', ['status', '--short']).slice(0,5000); }
function gitDiff() { return capture('git', ['diff', '--', 'src', 'public']).slice(0,10000); }
function repositoryMap(objective) { const objectiveFiles=new Set(objective.files||[]); const files=(repo.files||[]).filter((file)=>!isSensitive(file.path)&&(objectiveFiles.has(file.path)||file.path.startsWith('src/')||file.path.startsWith('api/'))).slice(0,160); const edges=(repo.dependencyEdges||[]).filter((edge)=>objectiveFiles.has(edge.from)).slice(0,160); return JSON.stringify({summary:repo.summary,files,dependencyEdges:edges},null,2).slice(0,14000); }
function listFiles(prefix='') { const files=(repo.files||[]).filter((file)=>!isSensitive(file.path)&&(!prefix||file.path.startsWith(prefix))).slice(0,500); return files.map((file)=>`${file.path} — ${file.lines||0} lines — ${file.purpose||''}`).join('\n')||'No indexed files matched.'; }
function searchRepo(query) { const value=String(query||'').trim(); if(!value)return'ERROR: search query is required.'; const result=capture('git',['grep','-n','-I','-F','--',value,':!builder/working',':!.env',':!.env.example']); return result.trim().slice(0,7000)||`No matches for: ${value}`; }
function readFileWindow(file,start=1,end=120) { file=String(file||''); if(!file||file.includes('..')||file.startsWith('/')||isSensitive(file))return'ERROR: unsafe path.'; if(!(repo.files||[]).some((entry)=>entry.path===file))return'ERROR: file is not in the repository index.'; const lines=read(file).split(/\r?\n/); const first=Math.max(1,Number(start)||1); const last=Math.min(lines.length,first+119,Number(end)||first+119); return lines.slice(first-1,last).map((line,index)=>`${String(first+index).padStart(4,' ')}| ${line}`).join('\n').slice(0,9000); }
function syntaxCheck(file) { if(!/\.(js|mjs|cjs|jsx)$/.test(file))return'PASS'; try{run(process.execPath,['--check',file]);return'PASS';}catch(error){return`FAIL ${[error.stdout,error.stderr,error.message].filter(Boolean).join('\n').slice(0,3000)}`;} }
function editFile(file,search,replacement,objective) { if(!allowedFile(file,objective))return'ERROR: out-of-scope write.'; const current=read(file); if(!current)return`ERROR: file not found: ${file}`; if(!search||typeof replacement!=='string')return'ERROR: search and replacement are required.'; const matches=current.split(search).length-1; if(matches!==1)return`ERROR: exact search must match once; found ${matches}.`; const next=current.replace(search,replacement); if(next===current||!next.trim())return'ERROR: no-op or empty edit refused.'; fs.writeFileSync(abs(file),next); const syntax=syntaxCheck(file); if(syntax!=='PASS')return`${syntax}; repair the file before continuing.`; return`EDIT APPLIED: ${file}`; }
function runCheck(check) { try { if(check==='build')run('npm',['run','build']); else if(check==='diff-check')run('git',['diff','--check']); else if(check==='changed-syntax'){const files=capture('git',['diff','--name-only','--','src','public']).split(/\r?\n/).filter(Boolean);for(const file of files)if(syntaxCheck(file)!=='PASS')throw new Error(`syntax failed: ${file}`);}else return`ERROR: unsupported check ${check}`; return'PASS'; }catch(error){return`FAIL ${[error.stdout,error.stderr,error.message].filter(Boolean).join('\n').slice(-7000)}`;} }
const tools=[
{type:'function',function:{name:'repository_map',description:'Read deterministic repository architecture knowledge.',parameters:{type:'object',properties:{}}}},
{type:'function',function:{name:'list_files',description:'List non-sensitive indexed repository files.',parameters:{type:'object',properties:{prefix:{type:'string'}}}}},
{type:'function',function:{name:'search_repo',description:'Search the whole non-sensitive repository.',parameters:{type:'object',required:['query'],properties:{query:{type:'string'}}}}},
{type:'function',function:{name:'read_file',description:'Read any indexed non-sensitive repository file.',parameters:{type:'object',required:['file'],properties:{file:{type:'string'},start:{type:'integer'},end:{type:'integer'}}}}},
{type:'function',function:{name:'git_status',description:'Inspect working tree status.',parameters:{type:'object',properties:{}}}},
{type:'function',function:{name:'git_diff',description:'Inspect current product diff.',parameters:{type:'object',properties:{}}}},
{type:'function',function:{name:'edit_file',description:'Replace one exact block in an objective file only.',parameters:{type:'object',required:['file','search','replace'],properties:{file:{type:'string'},search:{type:'string'},replace:{type:'string'}}}}},
{type:'function',function:{name:'run_check',description:'Run bounded verification.',parameters:{type:'object',required:['check'],properties:{check:{type:'string',enum:['build','diff-check','changed-syntax']}}}}},
{type:'function',function:{name:'submit',description:'Submit after the change has been verified.',parameters:{type:'object',required:['summary'],properties:{summary:{type:'string'}}}}}
];
function modelCall(messages) { const seconds=Math.min(300,Math.max(60,Math.floor(left()*60))); const body=JSON.stringify({model,stream:false,keep_alive:'15m',think:false,tools,options:{temperature:0,num_ctx:4096,num_predict:1200},messages}); const raw=run('curl',['-sS','--fail','--connect-timeout','15','--max-time',String(seconds),`${host}/api/chat`,'-H','Content-Type: application/json','-d',body],{timeout:(seconds+10)*1000}); const response=JSON.parse(raw); if(response.error)throw new Error(String(response.error)); return response; }
function parseToolCalls(response){return(response?.message?.tool_calls||[]).map((call)=>({name:call.function?.name,args:typeof call.function?.arguments==='string'?JSON.parse(call.function.arguments):(call.function?.arguments||{})}));}
function executeObjective(objective,repair){const snapshots=new Map();for(const file of objective.files||[])if(fs.existsSync(abs(file)))snapshots.set(file,read(file));let editCount=0,submitted=false,summary='';const prompt=['You are the senior autonomous engineer for Bikeztagram AI. Work on the real repository using tools; do not merely describe a solution.',`OBJECTIVE: ${objective.title}`,`PRIORITY: ${objective.priority}`,`VERIFIED PROGRESS: ${progress[objective.id]||0}`,`DEPENDENCIES: ${(objective.dependsOn||[]).join(', ')||'none'}`,'','REPOSITORY KNOWLEDGE:',repositoryMap(objective),'','ACCEPTANCE:',...(objective.acceptance||[]).map((item)=>`- ${item}`),'CONSTRAINTS:',...(objective.constraints||[]).map((item)=>`- ${item}`),'OBJECTIVE WRITE SCOPE:',...(objective.files||[]).map((file)=>`- ${file}`),'','Read broadly, write narrowly. Make a coherent production improvement. Use repository_map/list_files/search_repo/read_file before editing as needed. Use at most the edit budget. Test, diagnose and repair before submit. Never reset or clean the working tree. Never modify builder infrastructure, workflows, secrets, dependencies, Vercel config, or Gemini integration.',repair?'This is a repair attempt: inspect the current state and fix the previous failure rather than repeating it.':''].join('\n'); const messages=[{role:'system',content:'You are a multi-turn tool-using senior software engineer. Explore, edit, test, diagnose, repair, and submit verified code.'},{role:'user',content:prompt}];
for(let turn=1;turn<=maxTurns&&left()>0.75;turn+=1){console.log(`[autobot] agent turn ${turn}/${maxTurns}; edits=${editCount}/${maxEdits}; ${left().toFixed(1)}m left`);let response;try{response=modelCall(messages);}catch(error){console.error(`[autobot] model call failed: ${error.message}`);if(turn<maxTurns){messages.push({role:'user',content:`The previous model request failed or timed out. Continue with a shorter, direct tool-first response. Do not explain; call a repository tool now.`});continue;}break;}const assistant=response.message||{role:'assistant',content:''};messages.push(assistant);const calls=parseToolCalls(response);if(!calls.length)break;for(const call of calls){if(call.name==='submit'){submitted=true;summary=String(call.args.summary||'').slice(0,1000);messages.push({role:'tool',content:'Submission received. Runner verification is authoritative.'});continue;}let result;if(call.name==='repository_map')result=repositoryMap(objective);else if(call.name==='list_files')result=listFiles(call.args.prefix);else if(call.name==='search_repo')result=searchRepo(call.args.query);else if(call.name==='read_file')result=readFileWindow(call.args.file,call.args.start,call.args.end);else if(call.name==='git_status')result=gitStatus();else if(call.name==='git_diff')result=gitDiff();else if(call.name==='run_check')result=runCheck(call.args.check);else if(call.name==='edit_file'){if(editCount>=maxEdits)result=`ERROR: edit budget exhausted (${maxEdits}). Verify or submit.`;else{result=editFile(call.args.file,call.args.search,call.args.replace,objective);if(result.startsWith('EDIT APPLIED'))editCount+=1;}}else result=`ERROR: unknown tool ${call.name}`;console.log(`[autobot] ${call.name}: ${result.slice(0,800).replace(/\n/g,' ')}`);messages.push({role:'tool',content:result.slice(0,8000)});}if(submitted)break;}
if(!submitted){for(const [file,snapshot] of snapshots){const current=read(file);if(current!==snapshot)fs.writeFileSync(abs(file),snapshot);}return{ok:false,reason:'agent did not submit',edits:editCount};}const diff=gitDiff();if(!diff.trim()||editCount<1){for(const [file,snapshot] of snapshots){if(read(file)!==snapshot)fs.writeFileSync(abs(file),snapshot);}return{ok:false,reason:'submission had no verified product diff',edits:editCount};}const build=runCheck('build'),diffCheck=runCheck('diff-check');if(build!=='PASS'||diffCheck!=='PASS'){for(const [file,snapshot] of snapshots){if(read(file)!==snapshot)fs.writeFileSync(abs(file),snapshot);}return{ok:false,reason:`verification failed: ${build} / ${diffCheck}`,edits:editCount};}progress[objective.id]=Math.max(progress[objective.id]||0,1);saveState();appendAudit('repository-aware-feature-complete',{protocol:PROTOCOL,objectiveId:objective.id,summary,edits:editCount});return{ok:true,objective:objective.id,summary,edits:editCount};}

let completed=0;for(let feature=0;feature<maxFeatures&&left()>1;feature+=1){const objective=chooseObjective();if(!objective)break;attempts.set(objective.id,(attempts.get(objective.id)||0)+1);const result=executeObjective(objective,attempts.get(objective.id)>1);if(result.ok){completed+=1;console.log(`[autobot] feature complete: ${result.objective} edits=${result.edits}`);}else{state.failed=state.failed||{};state.failed[objective.id]={attempts:attempts.get(objective.id),reason:result.reason,updatedAt:new Date().toISOString()};saveState();console.error(`[autobot] feature failed: ${objective.id} ${result.reason}`);}}
console.log(`[autobot] repository-aware feature brain finished: completed=${completed}`);
if(completed===0&&maxFeatures>0)process.exitCode=1;
