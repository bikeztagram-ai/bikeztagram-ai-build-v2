import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import OutputFormatEnhancer from './outputFormatEnhancer.jsx';
import PromptSceneStudio from './promptSceneStudio.jsx';
import MusicStudio from './musicStudio.jsx';
import { installLocalAnalysisRuntime } from './localAnalysisRuntime.js';
import './styles.css';
import './qa.js';
import './exportTools.js';
installLocalAnalysisRuntime();
if ('serviceWorker' in navigator && import.meta.env.PROD) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => { console.warn('[PWA] Service worker registration failed:', error); }); }); }
createRoot(document.getElementById('root')).render(<React.StrictMode><App /><OutputFormatEnhancer /><PromptSceneStudio /><MusicStudio /></React.StrictMode>);
