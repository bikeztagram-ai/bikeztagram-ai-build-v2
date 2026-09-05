import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import OutputFormatEnhancer from './outputFormatEnhancer.jsx';
import PromptSceneStudio from './promptSceneStudio.jsx';
import MusicStudio from './musicStudio.jsx';
import MusicArrangementStudio from './musicArrangementStudio.jsx';
import { installLocalAnalysisRuntime } from './localAnalysisRuntime.js';
import { creativeRuntime } from './creativeRuntimeBootstrap.js';
import './styles.css';

class RuntimeBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return{error};}
  componentDidCatch(error,info){console.error('[Bikeztagram Runtime]',error,info);}
  render(){
    if(this.state.error){
      return <section style={{minHeight:'100vh',padding:'32px',boxSizing:'border-box',background:'#05090d',color:'#f4f7fb',fontFamily:'system-ui,sans-serif'}}>
        <div style={{maxWidth:'720px',margin:'0 auto',padding:'24px',border:'1px solid rgba(255,255,255,.12)',borderRadius:'18px',background:'rgba(255,255,255,.04)'}}>
          <div style={{fontSize:'12px',letterSpacing:'2px',opacity:.65}}>BIKEZTAGRAM AI • RUNTIME RECOVERY</div>
          <h2 style={{margin:'10px 0'}}>The app hit a browser runtime error.</h2>
          <p style={{opacity:.8}}>The deployment loaded, but one UI module failed while starting. The error has been captured so we can fix the exact cause instead of showing a blank screen.</p>
          <pre style={{whiteSpace:'pre-wrap',fontSize:'12px',lineHeight:1.5,opacity:.9}}>{String(this.state.error?.stack||this.state.error?.message||this.state.error)}</pre>
          <button style={{padding:'12px 16px',borderRadius:'10px',border:0,cursor:'pointer'}} onClick={()=>location.reload()}>Reload app</button>
        </div>
      </section>;
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RuntimeBoundary><App /></RuntimeBoundary>
    <RuntimeBoundary><OutputFormatEnhancer /></RuntimeBoundary>
    <RuntimeBoundary><PromptSceneStudio /></RuntimeBoundary>
    <RuntimeBoundary><MusicStudio /></RuntimeBoundary>
    <RuntimeBoundary><MusicArrangementStudio /></RuntimeBoundary>
  </React.StrictMode>
);

try { installLocalAnalysisRuntime(); } catch (error) { console.error('[Bikeztagram Local Runtime]', error); }
try { void creativeRuntime; } catch (error) { console.error('[Bikeztagram Creative Runtime]', error); }

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
      console.warn('[PWA] Service worker registration failed:', error);
    });
  });
}

import('./qa.js').catch((error) => console.warn('[QA] Observer failed to load:', error));
import('./exportTools.js').catch((error) => console.warn('[Export] Observer failed to load:', error));
