/* Bikeztagram AI — browser-only original generated-scene renderer V2.
 * This is an honest local/procedural fallback: it creates original pixels from a
 * scene blueprint when no external video model is available. It never claims
 * model inference and never fetches copyrighted media.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||a));
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function gradient(ctx,w,h,top,bottom){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(1,bottom);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
function drawEnvironment(ctx,w,h,environment,t,seed){
 const p=String(environment||'cinematic environment').toLowerCase();
 const city=/city|urban|street|neon/.test(p),space=/space|cosmic|galaxy/.test(p),desert=/desert|arid|sand/.test(p),forest=/forest|woodland/.test(p),mountain=/mountain|road|outdoor/.test(p);
 if(space)gradient(ctx,w,h,'#071027','#010207');else if(desert)gradient(ctx,w,h,'#392314','#0b0704');else if(forest)gradient(ctx,w,h,'#071510','#020605');else if(city)gradient(ctx,w,h,'#090d1c','#020307');else gradient(ctx,w,h,'#0b1220','#020409');
 if(space){for(let i=0;i<70;i++){const x=((hash(`${seed}s${i}`)+t*.015*(i%3+1))%1)*w,y=(hash(`${seed}y${i}`)*h);ctx.globalAlpha=.25+(i%4)*.12;ctx.fillStyle='#fff';ctx.fillRect(x,y,2+(i%3),2+(i%2));}}
 if(city){ctx.strokeStyle='rgba(90,150,220,.22)';ctx.lineWidth=2;for(let i=0;i<12;i++){const x=(i/12)*w;ctx.beginPath();ctx.moveTo(w/2,h*.55);ctx.lineTo(x,h);ctx.stroke();}for(let j=0;j<8;j++){const y=h*.58+j*h*.055;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}for(let i=0;i<14;i++){const x=(hash(`${seed}b${i}`)*w);const bh=h*(.12+hash(`${seed}h${i}`)*.3);ctx.fillStyle='rgba(15,25,48,.9)';ctx.fillRect(x,h*.58-bh,w*.035,bh);ctx.fillStyle='rgba(90,170,240,.35)';ctx.fillRect(x+w*.008,h*.61-bh,w*.006,h*.012);}}
 if(forest){ctx.fillStyle='rgba(3,15,12,.9)';for(let i=0;i<16;i++){const x=hash(`${seed}f${i}`)*w;const hh=h*(.18+hash(`${seed}fh${i}`)*.28);ctx.beginPath();ctx.moveTo(x,h*.72-hh);ctx.lineTo(x-w*.07,h*.72);ctx.lineTo(x+w*.07,h*.72);ctx.closePath();ctx.fill();}}
 if(mountain||desert){ctx.fillStyle=desert?'rgba(80,48,25,.8)':'rgba(6,15,27,.92)';ctx.beginPath();ctx.moveTo(0,h*.72);for(let i=0;i<=12;i++){const x=w*i/12;const peak=h*(.48+hash(`${seed}m${i}`)*.16);ctx.lineTo(x,peak);}ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();}
 ctx.globalAlpha=1;
}
function drawSubject(ctx,w,h,role,t,seed){const pulse=1+Math.sin(t*Math.PI*2)*.018;const cx=w*(.5+Math.sin(t*.7+hash(seed))*0.06),cy=h*(.61-(role==='action'?t*.08:0));const s=Math.min(w,h)*.22*pulse;ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.sin(t*.8)*.025);ctx.globalAlpha=.18;ctx.fillStyle='#69b9ff';ctx.beginPath();ctx.ellipse(0,s*.05,s*.8,s*.22,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#0c1420';ctx.strokeStyle='#9fd7ff';ctx.lineWidth=Math.max(3,w*.004);ctx.beginPath();ctx.ellipse(0,0,s*.48,s*.16,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-s*.42,0);ctx.lineTo(-s*.68,s*.18);ctx.lineTo(-s*.35,s*.22);ctx.lineTo(s*.35,s*.22);ctx.lineTo(s*.68,s*.18);ctx.lineTo(s*.42,0);ctx.stroke();ctx.fillStyle='#d7efff';ctx.fillRect(-s*.12,-s*.1,s*.24,s*.055);ctx.restore();}
export async function generateProceduralSceneVideo(scene,{width=1080,height=1920,fps=30,mimeType}={}){
 if(typeof document==='undefined'||typeof MediaRecorder==='undefined')throw new Error('Browser MediaRecorder is required for procedural scene video generation.');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2D context unavailable.');
 const duration=clamp(scene?.duration,.75,12);const stream=canvas.captureStream(fps);const candidates=[mimeType,'video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].filter(Boolean);const selected=candidates.find(t=>MediaRecorder.isTypeSupported(t))||'';const recorder=new MediaRecorder(stream,selected?{mimeType:selected,videoBitsPerSecond:8_000_000}:{videoBitsPerSecond:8_000_000});const chunks=[];recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};const stopped=new Promise((resolve,reject)=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||'video/webm'}));recorder.onerror=e=>reject(e.error||new Error('Procedural scene recording failed.'));});
 const started=performance.now();const seed=scene?.id||scene?.role||'bikeztagram';recorder.start(250);let frame=0;while(performance.now()-started<duration*1000){const now=performance.now();const t=Math.min(duration,(now-started)/1000);drawEnvironment(ctx,width,height,scene?.direction?.environment,t,seed);drawSubject(ctx,width,height,scene?.role||'bridge',t,seed);ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(0,0,width,height);ctx.fillStyle='rgba(210,230,255,.86)';ctx.font=`600 ${Math.round(width*.026)}px sans-serif`;ctx.fillText(String(scene?.role||'original scene').toUpperCase(),width*.07,height*.09);frame++;await new Promise(requestAnimationFrame);}
 recorder.stop();stream.getTracks().forEach(track=>track.stop());return await stopped;
}
