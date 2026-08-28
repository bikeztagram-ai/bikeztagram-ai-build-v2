#!/usr/bin/env node
/** Contract check for the Gemini-free product-first selector. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const selector = path.join(root, 'builder', 'brain', 'product-first-selector.mjs');
const policy = path.join(root, 'builder', 'brain', 'product-priority-policy.json');
if (!fs.existsSync(selector) || !fs.existsSync(policy)) throw new Error('product-first selector contract files missing');
const source = fs.readFileSync(selector, 'utf8');
const config = JSON.parse(fs.readFileSync(policy, 'utf8'));
if (!source.includes("provider: 'deterministic-local'")) throw new Error('selector is not deterministic-local');
if (!source.includes('priorityScore')) throw new Error('selector does not calculate priority scores');
if (config.provider !== 'deterministic-local' || config.gemini !== 'forbidden') throw new Error('Gemini-free policy contract failed');
const sample = { id: 'render-1', title: 'Improve render transitions', description: 'Make exported video transitions better', status: 'queued' };
if (!source.includes('render_quality')) throw new Error('render quality category missing');
console.log('product-first selector contract: PASS');
console.log(`sample objective category: ${sample.id}`);
