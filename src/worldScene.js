/* BIKEZTAGRAM AI — zero-cost procedural world compositor v7
   Product layer only. The protected Blob/Gemini pipeline is intentionally untouched.
   V7 focuses on the visible result: depth, moving environments, subject integration,
   lighting, reflections, atmosphere and camera language.
*/
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite';
const MOTORBIKE_CLASS = 14;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const ease = (v) => v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
const noise = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

function sceneMode(prompt = '') {
  const p = String(prompt).toLowerCase();
  if (/mars|red planet|martian|alien planet/.test(p)) return 'mars';
  if (/neon|cyber|future|futuristic|sci-fi|city|night city|street/.test(p)) return 'neon-city';
  if (/drone|drones|pursuit|chase|military/.test(p)) return 'drone-chase';
  if (/desert|dust|sand/.test(p)) return 'desert';
  if (/space|galaxy|cosmic|stars/.test(p)) return 'space';
  return 'cinematic-world';
}

function palette(mode) {
  if (mode === 'mars') return { sky0:'#120407', sky1:'#5b1714', ground:'#32130f', glow:'255,105,55', accent:'255,165,90' };
  if (mode === 'desert') return { sky0:'#0d1720', sky1:'#75462a', ground:'#3b281d', glow:'255,184,92', accent:'255,213,145' };
  if (mode === 'space') return { sky0:'#010208', sky1:'#0a1021', ground:'#080914', glow:'115,130,255', accent:'190,210,255' };
  if (mode === 'neon-city' || mode === 'drone-chase') return { sky0:'#01040a', sky1:'#092239', ground:'#03070d', glow:'45,205,255', accent:'255,55,190' };
  return { sky0:'#02070d', sky1:'#123043', ground:'#101a20', glow:'75,190,230', accent:'170,220,255' };
}

function gradient(ctx, w, h, a, b) {
  const g = ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,a); g.addColorStop(1,b); return g;
}

function drawSky(ctx, w, h, mode, t) {
  const p = palette(mode);
  ctx.fillStyle = gradient(ctx,w,h,p.sky0,p.sky1); ctx.fillRect(0,0,w,h);
  const sunX = w * (.5 + Math.sin(t*.23)*.18);
  const sunY = h * (mode === 'mars' || mode === 'desert' ? .28 : .22);
  const g = ctx.createRadialGradient(sunX,sunY,2,sunX,sunY,h*.42);
  g.addColorStop(0,`rgba(${p.glow},.28)`); g.addColorStop(.22,`rgba(${p.glow},.10)`); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  if (mode === 'space') {
    for (let i=0;i<180;i++) {
      const x=noise(i*3)*w, y=noise(i*7)*h*.62, s=.6+noise(i+90)*2.2;
      const a=.18+noise(i+120)*.72; ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.fillRect(x,y,s,s);
    }
  }
}

function drawCityLayer(ctx,w,h,t,depth,mode) {
  const horizon=h*(.51+depth*.045);
  const count=depth>0.5?24:15;
  for(let i=0;i<count;i++){
    const seed=i+depth*100;
    const bw=(45+noise(seed)*105)*(1-depth*.32);
    const bh=(90+noise(seed+8)*330)*(1-depth*.25);
    const x=((i/count)*w + Math.sin(t*(.18+depth*.18)+seed)*18 + w)%(w+bw)-bw*.5;
    const y=horizon-bh;
    ctx.fillStyle=depth>0.5?'rgba(2,9,17,.96)':'rgba(8,19,31,.86)';
    ctx.fillRect(x,y,bw,bh);
    const windows=depth>0.5?6:4;
    for(let r=0;r<windows;r++) for(let c=0;c<3;c++) if(noise(seed+r*11+c*7)>.42){
      const wx=x+10+c*(bw*.28), wy=y+16+r*(bh*.13);
      const warm=(i+r+c)%4===0;
      ctx.fillStyle=warm?'rgba(255,188,90,.38)':'rgba(40,205,255,.34)';
      ctx.fillRect(wx,wy,Math.max(3,bw*.055),Math.max(5,bh*.035));
    }
  }
}

function drawNeonArchitecture(ctx,w,h,t,mode) {
  if(mode==='neon-city'||mode==='drone-chase'){
    drawCityLayer(ctx,w,h,t,.82,mode); drawCityLayer(ctx,w,h,t,.28,mode);
    const horizon=h*.57;
    ctx.save(); ctx.globalCompositeOperation='screen';
    for(let i=0;i<12;i++){
      const x=((i/12)*w + Math.sin(t*.5+i)*24+w)%w;
      const y=horizon-80-noise(i+4)*230;
      const glow=ctx.createRadialGradient(x,y,1,x,y,80);
      glow.addColorStop(0,'rgba(60,220,255,.24)'); glow.addColorStop(1,'rgba(60,220,255,0)');
      ctx.fillStyle=glow; ctx.fillRect(x-90,y-90,180,180);
      ctx.fillStyle=i%3===0?'rgba(255,55,190,.72)':'rgba(55,215,255,.68)';
      ctx.fillRect(x-18,y,36,4);
    }
    ctx.restore();
  } else if(mode==='future') {
    for(let i=0;i<10;i++){
      const r=110+i*105+Math.sin(t*.8+i)*12;
      ctx.strokeStyle=`rgba(65,220,255,${.12-i*.006})`; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(w*.5,h*.55,r,Math.PI*1.05,Math.PI*1.95); ctx.stroke();
    }
  }
}

function drawTerrain(ctx,w,h,mode,t,shot) {
  const horizon=h*(shot===0?.57:shot===1?.54:.58);
  const p=palette(mode);
  ctx.fillStyle=p.ground; ctx.fillRect(0,horizon,w,h-horizon);
  if(mode==='mars'||mode==='desert'){
    ctx.fillStyle=mode==='mars'?'rgba(120,45,27,.7)':'rgba(118,76,42,.72)';
    ctx.beginPath(); ctx.moveTo(0,horizon+40);
    for(let x=0;x<=w;x+=50) ctx.lineTo(x,horizon+Math.sin(x*.012+t*.7)*22+35+noise(x)*24);
    ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
  }
  if(mode!=='space'){
    const road=ctx.createLinearGradient(0,horizon,0,h); road.addColorStop(0,'rgba(10,18,23,.12)'); road.addColorStop(.45,'rgba(4,8,12,.35)'); road.addColorStop(1,'rgba(0,0,0,.08)');
    ctx.fillStyle=road;ctx.fillRect(0,horizon,w,h-horizon);
    ctx.save();ctx.globalAlpha=mode==='mars'||mode==='desert'?.12:.20;ctx.strokeStyle=mode==='mars'?'#ff8b4d':'#54dfff';ctx.lineWidth=2;
    for(let i=-8;i<=8;i++){
      const bottom=w*.5+i*w*.18;ctx.beginPath();ctx.moveTo(w*.5+i*5,horizon);ctx.lineTo(bottom,h);ctx.stroke();
    }
    for(let i=1;i<12;i++){
      const q=i/12;const y=horizon+Math.pow(q,1.85)*(h-horizon);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
    }
    ctx.restore();
  }
}

function drawMovingLights(ctx,w,h,mode,t,shot) {
  const horizon=h*.57;
  ctx.save();ctx.globalCompositeOperation='screen';
  for(let i=0;i<18;i++){
    const q=(t*(.16+(i%4)*.045)+i/18)%1;
    const y=horizon+Math.pow(q,1.8)*(h-horizon);
    const x=w*.5+(noise(i+30)-.5)*w*(.22+q*.95);
    const len=12+q*150;
    ctx.strokeStyle=mode==='mars'?`rgba(255,140,65,${.08+q*.12})`:`rgba(55,215,255,${.08+q*.16})`;
    ctx.lineWidth=1+q*4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(x-w*.5)*.12,y-len);ctx.stroke();
  }
  if(shot===1){for(let i=0;i<10;i++){const x=((i*191+t*210)%(w+100))-50;const y=horizon-40-noise(i)*170;ctx.fillStyle=i%3===0?'rgba(255,60,190,.75)':'rgba(80,220,255,.75)';ctx.fillRect(x,y,4+noise(i)*12,2);}}
  ctx.restore();
}

function drawDrones(ctx,w,h,t,aggressive) {
  for(let i=0;i<3;i++){
    const x=w*(.16+i*.34)+Math.sin(t*(2.5+i)+i)*55*(aggressive?1.5:1);
    const y=h*(.18+(i%2)*.11)+Math.cos(t*3+i)*22;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*2+i)*.06);
    ctx.fillStyle='rgba(3,7,12,.98)';ctx.fillRect(-30,-7,60,14);
    ctx.strokeStyle='rgba(130,220,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-38,-11);ctx.lineTo(38,-11);ctx.stroke();
    ctx.fillStyle=i===1?'rgba(255,55,65,.95)':'rgba(55,220,255,.95)';ctx.fillRect(-17,7,9,3);ctx.fillRect(8,7,9,3);
    if(aggressive){const beam=ctx.createLinearGradient(0,8,0,380);beam.addColorStop(0,'rgba(255,55,65,.14)');beam.addColorStop(1,'rgba(255,55,65,0)');ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(-8,8);ctx.lineTo(8,8);ctx.lineTo(65,380);ctx.lineTo(-65,380);ctx.fill();}
    ctx.restore();
  }
}

function drawAtmosphere(ctx,w,h,mode,t,shot,prompt) {
  const p=String(prompt).toLowerCase();
  const rain=/rain|storm|wet|night/.test(p);
  const dust=mode==='mars'||mode==='desert';
  ctx.save();ctx.globalCompositeOperation='screen';
  if(rain){for(let i=0;i<100;i++){const x=noise(i*2)*w,y=((noise(i+8)*h+t*(550+noise(i)*300))%(h+100))-50;ctx.strokeStyle=`rgba(160,215,255,${.035+noise(i+4)*.09})`;ctx.lineWidth=1+noise(i+3)*1.4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-18,y+55);ctx.stroke();}}
  if(dust){for(let i=0;i<110;i++){const x=((noise(i)*w+t*(50+i%7)*8)%(w+140))-70;const y=h*(.45+noise(i+5)*.48)-t*(20+i%5);const a=.025+noise(i+9)*.06;ctx.fillStyle=mode==='mars'?`rgba(255,145,80,${a})`:`rgba(255,215,150,${a})`;ctx.fillRect(x,y,1+noise(i+2)*4,1+noise(i+3)*3);}}
  if(mode==='drone-chase') drawDrones(ctx,w,h,t,shot===1);
  ctx.restore();

  const fog=ctx.createLinearGradient(0,h*.42,0,h*.75);fog.addColorStop(0,'rgba(120,190,220,0)');fog.addColorStop(.6,'rgba(120,190,220,.055)');fog.addColorStop(1,'rgba(0,0,0,.12)');ctx.fillStyle=fog;ctx.fillRect(0,h*.35,w,h*.45);
}

function drawSubjectShadow(ctx,w,h,scale,mode,xOffset=0) {
  ctx.save();ctx.translate(w*.5+xOffset,h*.79);ctx.scale(1,.16);
  const g=ctx.createRadialGradient(0,0,8,0,0,w*.30);g.addColorStop(0,'rgba(0,0,0,.78)');g.addColorStop(.55,'rgba(0,0,0,.34)');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,w*.28*scale,h*.065,0,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawReflection(ctx,foreground,w,h,scale,xOffset) {
  ctx.save();ctx.globalAlpha=.12;ctx.globalCompositeOperation='screen';ctx.translate(w*.5+xOffset,h*.795);ctx.scale(scale,-scale*.28);ctx.translate(-w*.5,-h*.50);ctx.filter='blur(2px) saturate(1.1)';ctx.drawImage(foreground,0,0,w,h);ctx.restore();
  ctx.save();const g=ctx.createLinearGradient(0,h*.75,0,h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.8)');ctx.fillStyle=g;ctx.fillRect(0,h*.72,w,h*.28);ctx.restore();
}

function drawRimGlow(ctx,maskCanvas,w,h,dx,dy,dw,dh,mode) {
  ctx.save();ctx.globalCompositeOperation='screen';ctx.filter='blur(9px)';ctx.globalAlpha=.28;
  ctx.fillStyle=mode==='mars'?'rgba(255,110,55,.95)':'rgba(55,210,255,.95)';
  ctx.drawImage(maskCanvas,dx,dy,dw,dh);ctx.restore();
}

function drawGrade(ctx,w,h,mode,t) {
  const p=palette(mode);
  ctx.save();ctx.globalCompositeOperation='soft-light';ctx.fillStyle=`rgba(${p.glow},.075)`;ctx.fillRect(0,0,w,h);ctx.restore();
  const vignette=ctx.createRadialGradient(w*.5,h*.46,h*.12,w*.5,h*.46,h*.78);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.72,'rgba(0,0,0,.07)');vignette.addColorStop(1,'rgba(0,0,0,.72)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,w,24);ctx.fillRect(0,h-24,w,24);
}

async function loadVideo(source){
  const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.crossOrigin=source.remote?'anonymous':'';video.src=source.url;video.load();
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Timed out loading source for world scene.')),12000);const done=(err)=>{clearTimeout(timer);video.removeEventListener('loadedmetadata',onMeta);video.removeEventListener('error',onError);err?reject(err):resolve();};const onMeta=()=>video.videoWidth?done():null;const onError=()=>done(new Error(`Could not decode source (MediaError ${video.error?.code??'unknown'}).`));video.addEventListener('loadedmetadata',onMeta);video.addEventListener('error',onError);});
  return video;
}

function makeMask(result){
  const confidence=result.confidenceMasks?.[MOTORBIKE_CLASS];if(!confidence)return null;
  const values=confidence.getAsFloat32Array(),mw=confidence.width,mh=confidence.height,threshold=.48;const image=new ImageData(mw,mh);let count=0;
  for(let i=0;i<values.length;i++){const v=values[i];let a=v>threshold?clamp(Math.round((v-threshold)/(1-threshold)*255),0,255):0;if(a)count++;const j=i*4;image.data[j]=255;image.data[j+1]=255;image.data[j+2]=255;image.data[j+3]=a;}
  if(!count)return null;const c=document.createElement('canvas');c.width=mw;c.height=mh;c.getContext('2d').putImageData(image,0,0);return c;
}

async function createSegmenter(){const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');return ImageSegmenter.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL_URL,delegate:'CPU'},runningMode:'IMAGE',outputCategoryMask:false,outputConfidenceMasks:true});}
async function seek(video,time){return new Promise(resolve=>{const target=clamp(time,0,Math.max(0,video.duration-.05));if(Math.abs(video.currentTime-target)<.03&&video.readyState>=2){resolve();return;}const done=()=>{video.removeEventListener('seeked',done);resolve();};video.addEventListener('seeked',done,{once:true});video.currentTime=target;});}

export async function renderWorldScene({file,sourceUrl,prompt='',duration=8,onProgress}){
  const source=sourceUrl?{url:sourceUrl,remote:true}:{url:URL.createObjectURL(file),remote:false};
  try{
    const video=await loadVideo(source),w=1080,h=1920;const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Could not create world-scene canvas.');
    const sourceCanvas=document.createElement('canvas');sourceCanvas.width=video.videoWidth;sourceCanvas.height=video.videoHeight;const sctx=sourceCanvas.getContext('2d');
    let masks=[];let segmenter=null;
    try{segmenter=await createSegmenter();for(const fraction of [.08,.28,.50,.72,.92]){await seek(video,video.duration*fraction);sctx.drawImage(video,0,0,sourceCanvas.width,sourceCanvas.height);const mask=makeMask(await segmenter.segment(sourceCanvas));if(mask)masks.push({fraction,mask});}}catch(error){console.warn('[Bikeztagram] Subject matte unavailable; using full-frame fallback.',error);masks=[];}finally{try{segmenter?.close();}catch{}}
    await seek(video,0);video.loop=true;try{await video.play();}catch{}
    const foreground=document.createElement('canvas');foreground.width=w;foreground.height=h;const fctx=foreground.getContext('2d');
    const sourceRatio=video.videoWidth/video.videoHeight,targetRatio=w/h;let dw,dh;if(sourceRatio>targetRatio){dh=h*1.08;dw=dh*sourceRatio;}else{dw=w*1.08;dh=dw/sourceRatio;}const dx=(w-dw)/2,dy=(h-dh)/2;
    const mode=sceneMode(prompt);const stream=canvas.captureStream(30);const types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4;codecs=h264','video/mp4'];const type=types.find(x=>MediaRecorder.isTypeSupported(x))||'';const recorder=type?new MediaRecorder(stream,{mimeType:type}):new MediaRecorder(stream);const chunks=[];const stopped=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};recorder.onerror=e=>reject(e.error||new Error('World scene recorder failed.'));recorder.onstop=()=>chunks.length?resolve(new Blob(chunks,{type:chunks[0].type||type||'video/webm'})):reject(new Error('World scene produced no video data.'));});
    recorder.start(500);const started=performance.now();
    await new Promise(resolve=>{const frame=()=>{
      const t=clamp((performance.now()-started)/(duration*1000),0,1),shot=t<.34?0:t<.70?1:2,st=shot===0?t/.34:shot===1?(t-.34)/.36:(t-.70)/.30,e=ease(clamp(st,0,1));
      const scale=shot===0?1.08+e*.08:shot===1?1.15+Math.sin(st*Math.PI)*.12:1.25-e*.16;
      const xOffset=shot===0?-w*.035*e:shot===1?Math.sin(st*Math.PI)*w*.07:w*.045*e;const yOffset=shot===1?Math.sin(st*Math.PI)*h*.018:shot===2?-h*.025*e:0;const shake=shot===1?Math.sin(t*115)*2.8:Math.sin(t*38)*.7;
      if(video.readyState>=2)sctx.drawImage(video,0,0,sourceCanvas.width,sourceCanvas.height);
      drawSky(ctx,w,h,mode,t);drawNeonArchitecture(ctx,w,h,t,mode);drawTerrain(ctx,w,h,mode,t,shot);drawMovingLights(ctx,w,h,mode,t,shot);
      drawSubjectShadow(ctx,w,h,scale*.82,mode,xOffset+shake);
      ctx.save();ctx.translate(w*.5+xOffset+shake,h*.5+yOffset);ctx.scale(scale,scale);ctx.translate(-w*.5,-h*.5);
      if(masks.length){const fraction=video.currentTime/Math.max(.001,video.duration);let chosen=masks[0],best=Infinity;for(const m of masks){const d=Math.abs(m.fraction-fraction);if(d<best){best=d;chosen=m;}}
        fctx.clearRect(0,0,w,h);fctx.globalCompositeOperation='source-over';fctx.filter='brightness(.82) contrast(1.18) saturate(1.10)';fctx.drawImage(sourceCanvas,dx,dy,dw,dh);fctx.filter='none';fctx.globalCompositeOperation='destination-in';fctx.drawImage(chosen.mask,dx,dy,dw,dh);fctx.globalCompositeOperation='source-over';
        drawReflection(ctx,foreground,w,h,1,xOffset+shake);drawRimGlow(ctx,chosen.mask,w,h,dx,dy,dw,dh,mode);ctx.drawImage(foreground,0,0);
      }else{ctx.globalAlpha=.72;ctx.filter='brightness(.70) contrast(1.16) saturate(1.08)';ctx.drawImage(sourceCanvas,dx,dy,dw,dh);ctx.filter='none';ctx.globalAlpha=1;}
      ctx.restore();
      drawAtmosphere(ctx,w,h,mode,t,shot,prompt);drawGrade(ctx,w,h,mode,t);
      onProgress?.(Math.round(t*100));if(t>=1){resolve();return;}requestAnimationFrame(frame);};requestAnimationFrame(frame);});
    recorder.stop();const output=await stopped;if(!output?.size)throw new Error('World scene renderer produced an empty video.');return output;
  }finally{if(!sourceUrl){try{URL.revokeObjectURL(source.url);}catch{}}}
}
