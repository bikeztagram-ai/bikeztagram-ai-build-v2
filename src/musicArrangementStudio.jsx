import React,{useMemo,useState} from 'react';
import {createArrangementProject,updateArrangementSection,toggleArrangementStem,updateMastering,renderArrangementWav,analyseArrangement} from './musicArrangementRuntime.js';
import './musicArrangementStudio.css';

export default function MusicArrangementStudio(){
 const [project,setProject]=useState(()=>createArrangementProject({brief:{prompt:'dark cinematic motorcycle trailer, powerful original electronic score',duration:30}}));
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('Arrangement ready.');
 const stats=useMemo(()=>analyseArrangement(project),[project]);
 const edit=(index,patch)=>setProject(p=>updateArrangementSection(p,index,patch));
 const toggle=stem=>setProject(p=>toggleArrangementStem(p,stem));
 const render=async()=>{setBusy(true);try{const wav=await renderArrangementWav(project,{duration:project.composition.duration||30});const a=document.createElement('a');a.href=wav.audioDataUrl;a.download=`${project.title.replace(/[^a-z0-9_-]/gi,'-')}-master.wav`;a.click();setMessage('✅ Master WAV rendered locally.');}catch(error){setMessage(`❌ ${error.message}`);}finally{setBusy(false);}};
 return <aside className="arrangement-studio" aria-label="Music arrangement studio">
  <div className="arrangement-head"><div><span className="arrangement-kicker">MUSIC LAB</span><h3>Arrange the original score</h3></div><strong>{stats.bpm} BPM</strong></div>
  <p className="arrangement-note">Edit sections, mute stems and master the song locally. No external audio and no Gemini.</p>
  <div className="arrangement-stats"><span>{stats.key} {stats.mode}</span><span>{stats.sections} sections</span><span>{stats.events} events</span><span>{stats.activeStemCount}/5 stems</span></div>
  <div className="section-editor">{(project.composition.sections||[]).map((section,index)=><div className="arrangement-section" key={`${section.name}-${index}`}>
    <div><b>{section.name||`Section ${index+1}`}</b><small>{Number(section.durationBeats||0)} beats</small></div>
    <input aria-label={`${section.name||'Section'} energy`} type="range" min="0.2" max="1.4" step="0.05" value={Number(section.energy)||0.5} onChange={e=>edit(index,{energy:Number(e.target.value)})}/>
    <button type="button" onClick={()=>edit(index,{octave:(Number(section.octave)||0)+1})}>OCT+</button>
  </div>)}</div>
  <div className="stem-controls">{['drums','bass','harmony','melody','fx'].map(stem=><button key={stem} className={(project.mutedStems||[]).includes(stem)?'muted':''} type="button" onClick={()=>toggle(stem)}>{(project.mutedStems||[]).includes(stem)?'○':'●'} {stem}</button>)}</div>
  <div className="master-controls"><label>Gain <input type="range" min="-6" max="4" step="0.5" value={project.master.gainDb} onChange={e=>setProject(p=>updateMastering(p,{gainDb:Number(e.target.value)}))}/><b>{project.master.gainDb} dB</b></label><label>Width <input type="range" min="0.5" max="1.5" step="0.05" value={project.master.stereoWidth} onChange={e=>setProject(p=>updateMastering(p,{stereoWidth:Number(e.target.value)}))}/><b>{project.master.stereoWidth.toFixed(2)}×</b></label></div>
  <button className="arrangement-render" type="button" disabled={busy} onClick={render}>{busy?'RENDERING MASTER…':'EXPORT MASTER WAV'}</button><small className="arrangement-message">{message}</small>
 </aside>;
}
