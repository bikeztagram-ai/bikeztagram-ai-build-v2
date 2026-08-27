import React,{useEffect,useState} from 'react';

const base={position:'fixed',right:16,bottom:16,zIndex:1000,maxWidth:320,padding:'14px 16px',borderRadius:16,background:'rgba(10,14,20,.94)',border:'1px solid rgba(255,255,255,.12)',boxShadow:'0 12px 40px rgba(0,0,0,.35)',backdropFilter:'blur(14px)',fontFamily:'system-ui,sans-serif',color:'#fff'};

function read(){return typeof window!=='undefined'?window.__bikeztagramLastAutoQA||null:null;}

export default function QualityHud(){
  const [report,setReport]=useState(read);
  useEffect(()=>{const timer=setInterval(()=>setReport(read()),1000);return()=>clearInterval(timer);},[]);
  if(!report)return null;
  const passed=report.verdict==='PASS';
  const frame=report.frameQA||{};
  const audio=report.audioQA||{};
  const duration=Number(report.durationSeconds);
  const ratio=Number(frame.blackFrameRatio);
  return <aside aria-live="polite" aria-label="Automatic render quality" style={base}>
    <div style={{fontSize:12,letterSpacing:'.08em',textTransform:'uppercase',opacity:.65}}>Automatic render QA</div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:5}}>
      <strong style={{fontSize:18}}>{passed?'✓ Film looks healthy':'⚠ Needs attention'}</strong>
      <span style={{fontSize:11,opacity:.65}}>{report.kind==='automatic-render-observer'?'LIVE OUTPUT':'RENDER'}</span>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12,fontSize:12}}>
      <div>Duration<br/><b>{Number.isFinite(duration)?`${duration.toFixed(1)}s`:'—'}</b></div>
      <div>Playback<br/><b>{report.playbackAdvanced?'Advancing':'Not advancing'}</b></div>
      <div>Dark frames<br/><b>{Number.isFinite(ratio)?`${Math.round(ratio*100)}%`:'—'}</b></div>
      <div>Audio<br/><b>{audio.detected?'Detected':audio.reason==='not-required'?'Not required':'Check'}</b></div>
    </div>
    {!passed&&report.error&&<div style={{marginTop:10,fontSize:11,lineHeight:1.4,opacity:.75}}>{report.error}</div>}
  </aside>;
}
