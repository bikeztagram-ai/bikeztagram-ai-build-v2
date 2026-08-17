import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import CinematicStudio from './CinematicStudio.jsx';
import './styles.css';

const cinematicMode = window.location.hash === '#cinematic' || new URLSearchParams(window.location.search).get('studio') === 'cinematic';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {cinematicMode ? <CinematicStudio /> : <App />}
  </React.StrictMode>
);
