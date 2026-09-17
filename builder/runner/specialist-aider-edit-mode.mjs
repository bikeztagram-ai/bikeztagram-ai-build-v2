#!/usr/bin/env node
/**
 * Specialist Aider edit-mode contract. Keeps the proven feature brain intact
 * while making specialist edits use compact diff responses instead of whole-file
 * rewrites. The wrapper is intentionally tiny and delegates execution to the
 * existing Aider CLI with the same safety flags.
 */
import { spawnSync } from 'node:child_process';

const model=process.env.AUTOBOT_AIDER_MODEL||process.env.LOCAL_AI_MODEL||'ollama_chat/qwen2.5-coder:7b';
const message=process.env.AUTOBOT_SPECIALIST_AIDER_MESSAGE||'';
const files=String(process.env.AUTOBOT_SPECIALIST_AIDER_FILES||'').split(',').map(s=>s.trim()).filter(Boolean);
if(!message) throw new Error('AUTOBOT_SPECIALIST_AIDER_MESSAGE is required');
if(!files.length) throw new Error('AUTOBOT_SPECIALIST_AIDER_FILES is required');
const timeout=Math.max(30,Number.parseInt(process.env.AUTOBOT_SPECIALIST_AIDER_TIMEOUT_SECONDS||'600',10));
const args=[`--model=${model}`,`--timeout=${timeout}`,'--yes-always','--no-auto-commits','--no-dirty-commits','--no-gitignore','--no-show-model-warnings','--map-tokens=768','--subtree-only','--edit-format=diff','--message',message,...files];
const result=spawnSync('aider',args,{cwd:process.cwd(),stdio:'inherit',env:process.env});
process.exit(result.error?1:(result.status??1));
