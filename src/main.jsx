import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import CinematicStudio from './CinematicStudio.jsx';
import PlatformExports from './PlatformExports.jsx';
import './styles.css';

const cinematicMode = window.location.hash === '#cinematic' || new URLSearchParams(window.location.search).get('studio') === 'cinematic';

function AppWithPlatformExports() {
  return <>
    <App />
    <PlatformExports />
  </>;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {cinematicMode ? <CinematicStudio /> : <AppWithPlatformExports />}
  </React.StrictMode>
);
