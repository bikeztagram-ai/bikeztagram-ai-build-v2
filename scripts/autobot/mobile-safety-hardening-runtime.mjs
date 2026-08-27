#!/usr/bin/env node
import fs from 'node:fs';
const file='src/styles.css';
let source=fs.readFileSync(file,'utf8');
const marker='/* AUTOBOT_MOBILE_SAFE_AREA */';
if(!source.includes(marker)){
 source += `\n${marker}\n.mobile-safe-area{padding-bottom:max(12px,env(safe-area-inset-bottom));padding-left:max(0px,env(safe-area-inset-left));padding-right:max(0px,env(safe-area-inset-right));}\n.mobile-scroll-x{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;}\n@media (max-width:720px){.mobile-action-row{display:flex;flex-wrap:wrap;gap:8px}.mobile-action-row>*{min-height:44px}.mobile-scroll-x{scrollbar-width:none}.mobile-scroll-x::-webkit-scrollbar{display:none}}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added mobile-safe layout primitives.');
} else console.log('[autobot] Mobile-safe layout primitives already present.');
