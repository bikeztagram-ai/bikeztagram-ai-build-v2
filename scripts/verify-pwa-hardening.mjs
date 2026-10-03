import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
const sw=fs.readFileSync('public/sw.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks={
 manifestName:manifest.name==='Bikeztagram AI',
 standalone:manifest.display==='standalone',
 portrait:manifest.orientation==='portrait-primary',
 icon:manifest.icons?.some(i=>i.src.includes('/icons/icon.svg')),
 scope:manifest.scope==='/'&&manifest.start_url==='/',
 serviceWorkerCache:sw.includes('CACHE_NAME')&&sw.includes('skipWaiting')&&sw.includes('clients.claim'),
 navigationFallback:sw.includes("event.request.mode === 'navigate'")&&sw.includes('NAVIGATION_FALLBACK'),
 apiBypass:sw.includes("url.pathname.startsWith('/api/')"),
 manifestLinked:html.includes('rel="manifest"')&&html.includes('/manifest.webmanifest')
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
console.log(failed.length?'PWA HARDENING FAIL':'PWA HARDENING PASS');
if(failed.length){console.error(failed);process.exit(2);}
