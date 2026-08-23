import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import OutputFormatEnhancer from './outputFormatEnhancer.jsx';
import CreativeCommandCenter from './creativeCommandCenter.jsx';
import './styles.css';
import './qa.js';
import './exportTools.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <OutputFormatEnhancer />
    <CreativeCommandCenter />
  </React.StrictMode>
);
