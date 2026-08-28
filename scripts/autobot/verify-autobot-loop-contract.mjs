import fs from 'node:fs';
const spec=fs.readFileSync('builder/brain/STRATEGIC_BRAIN_SPEC.md','utf8');
if(!spec.includes('must not require Gemini'))throw new Error('Provider independence contract missing');
if(!spec.includes('Generated work is reviewable through a normal PR'))throw new Error('Reviewability contract missing');
console.log('PASS final AutoBot contract');
