import React,{useEffect} from 'react';
import {formatRenderedFilm} from './postRenderTranscoder.js';
import {downloadSocialFilm,shareSocialFilm} from './socialExport.js';

const OPTIONS=[
 {id:'portrait',label:'9:16',detail:'Reels • TikTok • Shorts'},
 {id:'square',label:'1:1',detail:'Square social feed'},
 {id:'landscape',label:'16:9',detail:'YouTube • landscape'}
];

function findResult(){return document.querySelector('.result-card');}
function getVideo(){return findResult()?.querySelector('video.film-preview')||null;}

export default function OutputFormatEnhancer(){
 useEffect(()=>{
  let selected='portrait';
  let controls=null;
  let observer=null;
  let boundButtons=[];
  let busy=false;

  const setMessage=(text)=>{
   const el=document.querySelector('[data-bike-output-status]');
   if(el)el.textContent=text;
  };
  const setBusy=(value)=>{busy=value;controls?.querySelectorAll('button,select').forEach(el=>{el.disabled=value;});};

  const runExport=async(mode)=>{
   if(busy)return;
   const video=getVideo();
   if(!video?.src)return setMessage('Build the film first.');
   setBusy(true);setMessage(mode==='share'?'Preparing share…':'Preparing export…');
   let blob = null;
   try{
    blob=await fetch(video.currentSrc||video.src).then(r=>r.blob());
    const result=await formatRenderedFilm(blob,{preset:selected,prompt:'' ,onProgress:(p)=>setMessage(`Formatting ${selected}… ${p}%`)});
    const name=(document.querySelector('.film-plan .section-title h3')?.textContent||'bikeztagram-ai-film').trim();
    if(mode==='share')await shareSocialFilm(result.blob,{presetId:selected,name});
    else downloadSocialFilm(result.blob,{presetId:selected,name});
    setMessage(`${OPTIONS.find(o=>o.id===selected)?.label||selected} export ready.`);
   }catch(err){
    console.error('[OUTPUT FORMAT] Formatting failed, recovering with original:',err);
    try {
      if (blob) {
        const name=(document.querySelector('.film-plan .section-title h3')?.textContent||'bikeztagram-ai-film').trim();
        if(mode==='share')await shareSocialFilm(blob,{presetId:'portrait',name});
        else downloadSocialFilm(blob,{presetId:'portrait',name});
        setMessage(`⚠️ Format failed: ${err?.message || String(err)}. Recovered: Exported original 9:16 film.`);
      } else {
        setMessage(`Export failed — ${err?.message||String(err)}`);
      }
    } catch (fallbackErr) {
      setMessage(`Export failed — ${err?.message||String(err)} • Fallback also failed: ${fallbackErr?.message || String(fallbackErr)}`);
    }
   }
   finally{setBusy(false);}
  };

  const wire=()=>{
   const result=findResult();
   if(!result)return;
   if(!controls){
    controls=document.createElement('div');
    controls.className='output-format-controls';
    controls.innerHTML=`<div class="output-format-heading"><strong>OUTPUT FORMAT</strong><small>Choose the final social canvas</small></div><div class="output-format-options">${OPTIONS.map(o=>`<button type="button" data-output-format="${o.id}"><strong>${o.label}</strong><small>${o.detail}</small></button>`).join('')}</div><div data-bike-output-status class="output-format-status">9:16 protected render • choose another format to reframe on export</div>`;
    const actionRow=result.querySelector('.action-row');
    if(actionRow)actionRow.parentNode.insertBefore(controls,actionRow);
    controls.querySelectorAll('[data-output-format]').forEach(btn=>btn.addEventListener('click',()=>{
      selected=btn.dataset.outputFormat||'portrait';
      controls.querySelectorAll('[data-output-format]').forEach(b=>b.classList.toggle('active',b===btn));
      setMessage(`${btn.querySelector('strong')?.textContent||selected} selected. The protected 9:16 render remains unchanged.`);
    }));
    controls.querySelector('[data-output-format="portrait"]')?.classList.add('active');
   }
   const buttons=Array.from(result.querySelectorAll('.action-row button')).filter(b=>/export film/i.test(b.textContent)||/share/i.test(b.textContent));
   buttons.forEach(button=>{
    if(button.dataset.outputFormatBound==='1')return;
    button.dataset.outputFormatBound='1';
    const mode=/share/i.test(button.textContent)?'share':'export';
    const handler=(event)=>{event.preventDefault();event.stopImmediatePropagation();runExport(mode);};
    button.addEventListener('click',handler,true);
    boundButtons.push([button,handler]);
   });
  };

  observer=new MutationObserver(wire);observer.observe(document.body,{childList:true,subtree:true});wire();
  return()=>{observer?.disconnect();boundButtons.forEach(([b,h])=>b.removeEventListener('click',h,true));controls?.remove();};
 },[]);
 return null;
}
