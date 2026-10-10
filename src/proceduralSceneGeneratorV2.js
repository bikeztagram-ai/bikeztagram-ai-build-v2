/*
 * In-house generated-scene runtime.
 * Prompt-aware procedural fallback. Not a foundation video model.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(n)=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
const ease=(t)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const polygon=(ctx,pts,fill,stroke='#15283a',line=2)=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}};
const palette=(prompt)=>{const q=String(prompt||'').toLowerCase();if(/desert|mars|sand|dust/.test(q))return{sky:['#160b08','#6d3021','#c76b3b'],glow:'#ffb36b',ground:'#241512',accent:'#f08a55'};if(/space|galaxy|cosmic|star/.test(q))return{sky:['#01020a','#0a1022','#17112b'],glow:'#9ed8ff',ground:'#03040b',accent:'#75cfff'};if(/neon|cyber|future|city|night/.test(q))return{sky:['#01050b','#071b2a','#190c27'],glow:'#42d9ff',ground:'#02060a',accent:'#ff4fd8'};if(/forest|mountain|nature/.test(q))return{sky:['#06120c','#173b2b','#4b6548'],glow:'#c4e7a0',ground:'#08100b',accent:'#8fd36a'};return{sky:['#05090f','#10293a','#1d3444'],glow:'#b9e9ff',ground:'#06090c',accent:'#6ed8ff'};};

function drawBike(ctx,w,h,p,q){
 const side=/side|profile|parallel/.test(q), close=/close|detail|hero|portrait/.test(q);
 const shot=Math.floor(p*3), scale=(close?1.05:.92)*(shot===1?.78:shot===2?1.02:1);
 const x=w*(shot===1?.57:.51)+Math.sin(p*Math.PI*4)*w*.035;
 const y=h*(shot===1?.77:shot===2?.76:.765);
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(shot===2?Math.sin(p*Math.PI*6)*.035:0);
 // Ground shadow, reflected headlight and road spray.
 const glow=ctx.createRadialGradient(0,28,4,0,28,190);glow.addColorStop(0,'rgba(0,132,255,.42)');glow.addColorStop(1,'rgba(0,90,255,0)');ctx.fillStyle=glow;ctx.fillRect(-220,-170,440,260);
 ctx.fillStyle='rgba(0,0,0,.72)';ctx.beginPath();ctx.ellipse(0,48,154,25,0,0,Math.PI*2);ctx.fill();
 const wr=close?51:46, spin=p*Math.PI*10;
 function wheel(wx,wy,r){ctx.save();ctx.translate(wx,wy);ctx.rotate(spin);ctx.fillStyle='#03060a';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a9bfce';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,r*.78,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#536a7d';ctx.lineWidth=2;for(let i=0;i<10;i++){ctx.rotate(Math.PI/5);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,r*.72);ctx.stroke();}ctx.fillStyle='#c9e0ef';ctx.beginPath();ctx.arc(0,0,r*.17,0,Math.PI*2);ctx.fill();ctx.restore();}
 wheel(-91,27,wr);wheel(92,27,wr);
 // Swingarm, engine and chassis.
 polygon(ctx,[[-91,22],[-38,-10],[30,15],[92,24],[60,39],[-48,39]],'#526779','#192737',4);
 ctx.fillStyle='#1a2735';ctx.fillRect(-29,2,64,34);ctx.fillStyle='#8799a8';ctx.fillRect(-13,9,30,19);
 // Exhaust canister.
 ctx.save();ctx.rotate(-.08);ctx.fillStyle='#758a9b';ctx.fillRect(23,23,62,11);ctx.fillStyle='#c1d2df';ctx.fillRect(27,25,46,3);ctx.restore();
 // Blue tank and sharply layered sportbike fairings.
 polygon(ctx,[[-42,-17],[-24,-48],[13,-49],[45,-25],[34,-3],[4,10],[-31,4]],'#075fc8','#58c4ff',4);
 polygon(ctx,[[-48,-18],[-78,-8],[-96,11],[-71,24],[-33,17],[-16,2]],'#083b88','#4baaff',3);
 polygon(ctx,[[-74,-7],[-60,-33],[-29,-48],[-17,-27],[-39,-14]],'#087df4','#79d5ff',3);
 polygon(ctx,[[12,-46],[42,-42],[65,-15],[53,7],[31,3],[26,-22]],'#06336f','#4eb6ff',3);
 // Windscreen, forks, controls and bright LED lamp.
 polygon(ctx,[[23,-49],[39,-66],[53,-59],[43,-43]],'#101b2a','#5d748a',2);
 ctx.strokeStyle='#b9cad7';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(53,-28);ctx.lineTo(83,24);ctx.stroke();
 polygon(ctx,[[47,-24],[62,-20],[58,-8],[44,-12]],'#efffff','#6edcff',2);
 ctx.strokeStyle='#a9bac8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(16,-45);ctx.lineTo(31,-59);ctx.lineTo(58,-56);ctx.lineTo(67,-65);ctx.stroke();
 // Rider: boots/legs, riding jacket, arms and helmet.
 polygon(ctx,[[-30,-39],[-9,-48],[13,-30],[5,-8],[-15,0],[-39,-14]],'#111a27','#647b91',3);
 polygon(ctx,[[-17,-9],[8,-10],[39,17],[24,29],[1,14],[-32,12]],'#101722','#50687e',3);
 polygon(ctx,[[17,19],[41,21],[48,30],[20,33]],'#070a10','#778a9a',2);
 polygon(ctx,[[-34,-75],[-17,-94],[10,-85],[28,-57],[9,-39],[-20,-47]],'#101b2a','#6b8195',3);
 polygon(ctx,[[-30,-71],[-15,-85],[3,-78],[-5,-58],[-22,-54]],'#075bb8','#389fff',2);
 polygon(ctx,[[10,-76],[30,-58],[54,-46],[49,-38],[25,-49],[4,-58]],'#121b28','#5d7186',4);
 ctx.fillStyle='#070c15';ctx.beginPath();ctx.ellipse(-9,-101,23,25,-.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#168fff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(-9,-101,21,-.8,1.8);ctx.stroke();
 ctx.fillStyle='#b9f4ff';ctx.fillRect(0,-107,20,9);ctx.fillStyle='#ff244d';ctx.shadowColor='#ff244d';ctx.shadowBlur=18;ctx.fillRect(-99,-1,12,6);ctx.shadowBlur=0;
 // Edge highlights and tyre motion.
 ctx.strokeStyle='rgba(137,216,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-68,-24);ctx.lineTo(-43,-41);ctx.lineTo(-20,-43);ctx.stroke();
 if(!side){ctx.globalAlpha=.22;ctx.strokeStyle='#7bd8ff';for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(-145+i*8,40);ctx.lineTo(-180+i*12,80+hash(i)*25);ctx.stroke();}}
 ctx.restore();
}

function drawScene(ctx,w,h,p,request){
 const q=String(request.prompt||request.purpose||'').toLowerCase(),pal=palette(q),t=ease(clamp(p,0,1));
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,pal.sky[0]);g.addColorStop(.58,pal.sky[1]);g.addColorStop(1,pal.sky[2]);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 const horizon=h*(.50+Math.sin(p*Math.PI)*.015);
 const glow=ctx.createRadialGradient(w*(.5+.08*Math.sin(t*Math.PI)),h*.38,0,w*.5,h*.48,w*.7);glow.addColorStop(0,pal.glow+'55');glow.addColorStop(.32,pal.glow+'16');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 if(/space|galaxy|cosmic|star/.test(q)){for(let i=0;i<110;i++){const x=hash(i+11)*w,y=hash(i+31)*h*.68,r=.5+hash(i+71)*2;ctx.fillStyle=`rgba(255,255,255,${.18+hash(i+91)*.72})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}}
 if(/city|neon|cyber|future|night/.test(q)||!/space|desert|mars/.test(q)){for(let i=0;i<18;i++){const bw=45+hash(i+4)*100,bh=100+hash(i+8)*360,x=i*(w/17)-20,y=horizon-bh;ctx.fillStyle='rgba(2,7,12,.94)';ctx.fillRect(x,y,bw,bh);for(let k=0;k<10;k++)if(hash(i*17+k)>.45){ctx.fillStyle=pal.accent+'99';ctx.fillRect(x+12+(k%3)*22,y+18+Math.floor(k/3)*35,7,11);}}}
 if(/desert|mars|sand|dust/.test(q)){ctx.fillStyle=pal.ground;ctx.beginPath();ctx.moveTo(0,horizon);for(let i=0;i<=20;i++)ctx.lineTo(i*w/20,horizon+hash(i+100)*70);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();}
 else if(/forest|mountain|nature/.test(q)){ctx.fillStyle=pal.ground;ctx.beginPath();ctx.moveTo(0,horizon+80);for(let i=0;i<=16;i++)ctx.lineTo(i*w/16,horizon-hash(i+200)*150);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();}
 else {ctx.fillStyle=pal.ground;ctx.fillRect(0,horizon,w,h-horizon);}
 // Perspective road and luminous lane marks, composed around the hero subject.
 ctx.save();ctx.fillStyle='#080f18';ctx.beginPath();ctx.moveTo(w*.37,horizon);ctx.lineTo(w*.63,horizon);ctx.lineTo(w*1.22,h);ctx.lineTo(-w*.22,h);ctx.closePath();ctx.fill();
 ctx.globalAlpha=.42;ctx.strokeStyle=pal.accent;ctx.lineWidth=2;for(let i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(w/2+i*55,h);ctx.lineTo(w/2+i*7,horizon);ctx.stroke();}
 ctx.globalAlpha=.35;for(let i=0;i<8;i++){const z=((i/8+p*.5)%1),y=horizon+z*z*(h-horizon),wide=z*42+2;ctx.fillStyle='#e9f8ff';ctx.fillRect(w/2-wide/2,y,wide,Math.max(2,z*13));}ctx.restore();
 if(/action|chase|race|speed|motion/.test(q)){ctx.save();ctx.globalAlpha=.2;ctx.strokeStyle='#fff';for(let i=0;i<18;i++){const y=horizon+hash(i+300)*h*.38,x=hash(i+400)*w,len=80+hash(i+500)*250;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-len*(.3+.7*t),y);ctx.stroke();}ctx.restore();}
 const motorcycle=/motorcycle|motorbike|bike|rider|ninja|kawasaki|sportbike|sport bike|road trip|lone rider/.test(q);
 if(motorcycle)drawBike(ctx,w,h,p,q);
 const pulse=.5+.5*Math.sin(t*Math.PI*2),title=String(request.title||'').trim();
 if(title){ctx.save();ctx.globalAlpha=.55+.35*pulse;ctx.textAlign='center';ctx.font='700 42px system-ui,sans-serif';ctx.fillStyle='#fff';ctx.shadowBlur=24;ctx.shadowColor=pal.accent;ctx.fillText(title.slice(0,34),w/2,h*.17);ctx.restore();}
 const vignette=ctx.createRadialGradient(w/2,h/2,h*.18,w/2,h/2,h*.78);vignette.addColorStop(0,'transparent');vignette.addColorStop(.72,'rgba(0,0,0,.08)');vignette.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
}

export async function generateProceduralSceneV2({prompt='',purpose='generated scene',duration=4,fps=30,width=540,height=960,title='',onProgress}={}){
 if(typeof document==='undefined'||typeof MediaRecorder==='undefined')throw new Error('Procedural scene generation requires a browser MediaRecorder runtime.');
 const seconds=clamp(Number(duration)||4,1,12),rate=clamp(Number(fps)||30,24,30),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Could not create procedural scene canvas.');
 const stream=canvas.captureStream(rate),types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'],mime=types.find(x=>MediaRecorder.isTypeSupported(x))||'';const recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:5000000}:undefined);const chunks=[];let timer=0;
 const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};recorder.onerror=e=>reject(e.error||new Error('Procedural scene recorder failed.'));recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||'video/webm'}));});
 recorder.start(250);const started=performance.now();
 await new Promise((resolve,reject)=>{const tick=()=>{try{const p=clamp((performance.now()-started)/1000/seconds,0,1);drawScene(ctx,width,height,p,{prompt,purpose,title});onProgress?.(Math.round(p*100));if(p>=1){resolve();return;}timer=requestAnimationFrame(tick);}catch(error){reject(error);}};tick();});
 cancelAnimationFrame(timer);recorder.stop();const blob=await done;return{blob,url:URL.createObjectURL(blob),mimeType:blob.type,duration:seconds,width,height,sourceType:'generated',generator:'procedural-cinematic-v3-subject-aware',prompt,purpose};
}
export function canGenerateProceduralSceneV2(){return typeof document!=='undefined'&&typeof MediaRecorder!=='undefined'&&typeof HTMLCanvasElement!=='undefined';}
