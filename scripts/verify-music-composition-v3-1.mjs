import {buildLongFormMusicComposition} from '../src/musicCompositionV3.js';
const c=buildLongFormMusicComposition({duration:240,prompt:'original cinematic song',filmType:'song',genre:'electronic rock',mood:'dark',energy:.8,bpm:118});
if(c.structure!=='song')throw new Error('Song structure not selected.');
for(const name of ['intro','verse-a','pre-chorus','chorus','verse-b','bridge','final-chorus','outro'])if(!c.sections.some(s=>s.name===name))throw new Error(`Missing ${name}`);
if(!c.arrangement.counterline||!c.arrangement.sectionContrast||!c.arrangement.automation)throw new Error('Full arrangement contract incomplete.');
if(!c.sections.some(s=>s.name==='final-chorus'&&s.roles.includes('lead-hook')))throw new Error('Final chorus arrangement incomplete.');
if(!c.copyright.originalOnly||c.copyright.noNamedSongImitation!==true)throw new Error('Originality contract missing.');
console.log('PASS: four-minute original song blueprint contains structured sections, hooks, development, contrast and production roles.');
