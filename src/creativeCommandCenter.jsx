import React,{useEffect} from 'react';

const MODES=[
 {id:'cinematic',label:'CINEMATIC TRAILER',prompt:'Create a premium cinematic motorcycle trailer. Build mystery, anticipation, reveal, acceleration and a powerful hero ending. Use authentic uploaded footage first, strong composition, varied shot rhythm, subtle premium text and an original dark cinematic soundtrack.'},
 {id:'social',label:'SOCIAL REEL',prompt:'Create the strongest 15-second social-media reel from this media. Hook immediately, remove weak or repetitive shots, cut tightly to rhythm, build energy, reveal the subject and finish on the strongest hero moment. Keep it premium and authentic.'},
 {id:'story',label:'STORY FILM',prompt:'Direct this media as a short cinematic story with a clear beginning, build, reveal, action and ending. Prioritise continuity, emotional progression, shot variety and natural visual storytelling. Use generated inserts only when they strengthen the story.'},
 {id:'generated',label:'HYBRID WORLD',prompt:'Create a cinematic hybrid film using the uploaded subject as the continuity anchor. Preserve the real subject identity, combine authentic footage with original generated/procedural scene inserts where useful, and keep all generated material copyright-safe and original.'}
];

function setNativeValue(el,value){
 const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
 const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
 setter?.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
}
function findPrompt(){return document.querySelector('textarea')||document.querySelector('input[type="text"]');}
function findAction(label){return Array.from(document.querySelectorAll('button')).find(b=>new RegExp(label,'i').test(b.textContent||''));}
function statusText(){return document.querySelector('[data-bike-output-status]')?.textContent||'';}

export default function CreativeCommandCenter(){
 useEffect(()=>{
  let panel=null;let observer=null;let timer=null;
  const run=(mode)=>{
   const selected=MODES.find(m=>m.id===mode)||MODES[0];const prompt=findPrompt();
   if(!prompt){window.alert('Add your media first; the Creative Director prompt control is not available yet.');return;}
   setNativeValue(prompt,selected.prompt);
   prompt.focus();
   const analyse=findAction('analyse|direct|create film');
   if(analyse){analyse.click();return;}
   window.dispatchEvent(new CustomEvent('bikeztagram:creative-command',{detail:selected}));
  };
  const render=()=>{
   const host=document.querySelector('.app-container');if(!host||panel)return;
   panel=document.createElement('section');panel.className='creative-command-center';panel.innerHTML=`<div class="ccc-head"><div><span class="ccc-kicker">CREATIVE ENGINE</span><h2>DIRECT YOUR FILM</h2><p>One instruction. Authentic footage first. Music, scenes, edit and QA handled by the pipeline.</p></div><div class="ccc-pulse">● READY</div></div><div class="ccc-modes">${MODES.map(m=>`<button type="button" data-ccc-mode="${m.id}"><strong>${m.label}</strong><small>${m.id==='generated'?'Real footage + original generated inserts':m.id==='social'?'Fast hook + beat-aware social pacing':m.id==='story'?'Continuity + narrative progression':'Premium trailer direction'}</small></button>`).join('')}</div><div class="ccc-footer"><span data-ccc-status>Choose a direction to brief the AI Director.</span><span class="ccc-flow">MEDIA → GEMINI → DIRECTOR → MUSIC + SCENES → RENDER → QA</span></div>`;
   const anchor=host.querySelector('.app-header')||host.firstElementChild;if(anchor)anchor.insertAdjacentElement('afterend',panel);else host.prepend(panel);
   panel.querySelectorAll('[data-ccc-mode]').forEach(b=>b.addEventListener('click',()=>{panel.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');run(b.dataset.cccMode);const s=panel.querySelector('[data-ccc-status]');if(s)s.textContent=`Briefing selected: ${b.querySelector('strong')?.textContent||'Creative Director'}…`; }));
  };
  const wire=()=>{if(!panel)render();};
  observer=new MutationObserver(wire);observer.observe(document.body,{childList:true,subtree:true});render();
  timer=setInterval(()=>{const s=panel?.querySelector('[data-ccc-status]');const t=statusText();if(s&&t)s.textContent=t;},1200);
  return()=>{observer?.disconnect();clearInterval(timer);panel?.remove();};
 },[]);
 return null;
}
