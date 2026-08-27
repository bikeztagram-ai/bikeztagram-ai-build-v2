#!/usr/bin/env node
import fs from 'node:fs';
const file='src/styles.css';
let source=fs.readFileSync(file,'utf8');
const marker='/* AUTOBOT_REDUCED_MOTION */';
if(!source.includes(marker)){
 source += `\n${marker}\n@media (prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added reduced-motion accessibility hardening.');
} else console.log('[autobot] Reduced-motion hardening already present.');
