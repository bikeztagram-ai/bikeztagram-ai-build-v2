/*
 * In-house generated-scene runtime.
 *
 * This is deliberately provider-free: prompts are converted into deterministic
 * cinematic scenes in the browser using Canvas + MediaRecorder. It is not a
 * foundation video model; it is the local generation layer and a safe fallback
 * when an external text/image-to-video provider is unavailable.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(n)=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
const ease=(t)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

function palette(prompt){
 const q=String(prompt||'').toLowerCase();
 if(/desert|mars|sand|dust/.test(q))return {sky:['#160b08','#6d3021','#c76b3b'],glow:'#ffb36b',ground:'#241512',accent:'#f08a55'};
 if(/space|galaxy|cosmic|star/.test(q))return {sky:['#01020a','#0a1022','#17112b'],glow:'#9ed8ff',ground:'#03040b',accent:'#75cfff'};
 if(/neon|cyber|future|city|night/.test(q))return {sky:['#01050b','#071b2a','#190c27'],glow:'#42d9ff',ground:'#02060a',accent:'#ff4fd8'};
 if(/forest|mountain|nature/.test(q))return {sky:['#06120c','#173b2b','#4b6548'],glow:'#c4e7a0',ground:'#08100b',accent:'#8fd36a'};
 return {sky:['#05090f','#10293a','#1d3444'],glow:'#b9e9ff',ground:'#06090c',accent:'#6ed8ff'};
}

function drawScene(ctx,w,h,p,request){
 const q=String(request.prompt||request.purpose||'').toLowerCase(), pal=palette(q), t=ease(clamp(p,0,1));
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,pal.sky[0]);g.addColorStop(.58,pal.sky[1]);g.addColorStop(1,pal.sky[2]);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 const horizon=h*(.54+Math.sin(p*Math.PI)*.015);
 const glow=ctx.createRadialGradient(w*(.5+.08*Math.sin(t*Math.PI)),h*.38,0,w*.5,h*.48,w*.7);glow.addColorStop(0,pal.glow+'55');glow.addColorStop(.32,pal.glow+'16');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 if(/space|galaxy|cosmic|star/.test(q)){for(let i=0;i<110;i++){const x=hash(i+11)*w,y=hash(i+31)*h*.68,r=.5+hash(i+71)*2;ctx.fillStyle=`rgba(255,255,255,${.18+hash(i+91)*.72})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}}
 if(/city|neon|cyber|future|night/.test(q)||!/space|desert|mars/.test(q)){for(let i=0;i<18;i++){const bw=45+hash(i+4)*100,bh=100+hash(i+8)*360,x=i*(w/17)-20,y=horizon-bh;ctx.fillStyle='rgba(2,7,12,.94)';ctx.fillRect(x,y,bw,bh);for(let k=0;k<10;k++)if(hash(i*17+k)>.45){ctx.fillStyle=pal.accent+'77';ctx.fillRect(x+12+(k%3)*22,y+18+Math.floor(k/3)*35,7,11);}}}
 if(/desert|mars|sand|dust/.test(q)){ctx.fillStyle=pal.ground;ctx.beginPath();ctx.moveTo(0,horizon);for(let i=0;i<=20;i++)ctx.lineTo(i*w/20,horizon+hash(i+100)*70);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();}
 else if(/forest|mountain|nature/.test(q)){ctx.fillStyle=pal.ground;ctx.beginPath();ctx.moveTo(0,horizon+80);for(let i=0;i<=16;i++)ctx.lineTo(i*w/16,horizon-hash(i+200)*150);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();}
 else {ctx.fillStyle=pal.ground;ctx.fillRect(0,horizon,w,h-horizon);}
 ctx.save();ctx.globalAlpha=.24;ctx.strokeStyle=pal.accent;ctx.lineWidth=2;for(let i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(w/2+i*55,h);ctx.lineTo(w/2+i*7,horizon);ctx.stroke();}ctx.restore();
 if(/action|chase|race|speed|motion/.test(q)){ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle='#fff';for(let i=0;i<18;i++){const y=horizon+hash(i+300)*h*.38,x=hash(i+400)*w,len=80+hash(i+500)*250;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-len*(.3+.7*t),y);ctx.stroke();}ctx.restore();}
 const pulse=.5+.5*Math.sin(t*Math.PI*2),title=String(request.title||'').trim();
 if(title){ctx.save();ctx.globalAlpha=.55+.35*pulse;ctx.textAlign='center';ctx.font='700 52px system-ui,sans-serif';ctx.fillStyle='#fff';ctx.shadowBlur=24;ctx.shadowColor=pal.accent;ctx.fillText(title.slice(0,34),w/2,h*.79);ctx.restore();}
 const vignette=ctx.createRadialGradient(w/2,h/2,h*.18,w/2,h/2,h*.78);vignette.addColorStop(0,'transparent');vignette.addColorStop(.72,'rgba(0,0,0,.08)');vignette.addColorStop(1,'rgba(0,0,0,.62)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
}

export async function generateProceduralSceneV2({prompt='',purpose='generated scene',duration=4,fps=30,width=540,height=960,title='',onProgress}={}){
 if(typeof document==='undefined'||typeof MediaRecorder==='undefined')throw new Error('Procedural scene generation requires a browser MediaRecorder runtime.');
 const seconds=clamp(Number(duration)||4,1,12),rate=clamp(Number(fps)||30,24,30),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Could not create procedural scene canvas.');
 const stream=canvas.captureStream(rate),types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'],mime=types.find(x=>MediaRecorder.isTypeSupported(x))||'';const recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:5000000}:undefined);const chunks=[];let timer=0;
 const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};recorder.onerror=e=>reject(e.error||new Error('Procedural scene recorder failed.'));recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||'video/webm'}));});
 recorder.start(250);const started=performance.now();
 await new Promise((resolve)=>{const tick=()=>{const p=clamp((performance.now()-started)/1000/seconds,0,1);drawScene(ctx,width,height,p,{prompt,purpose,title});onProgress?.(Math.round(p*100));if(p>=1){resolve();return;}timer=requestAnimationFrame(tick);};tick();});
 cancelAnimationFrame(timer);recorder.stop();const blob=await done;return {blob,url:URL.createObjectURL(blob),mimeType:blob.type,duration:seconds,width,height,sourceType:'generated',generator:'procedural-cinematic-v2',prompt,purpose};
}

export function canGenerateProceduralSceneV2(){return typeof document!=='undefined'&&typeof MediaRecorder!=='undefined'&&typeof HTMLCanvasElement!=='undefined';}
