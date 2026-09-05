/* BIKEZTAGRAM AI — Universal Creative Scene Engine
   Zero-cost, local, prompt-directed scene generation.
   No remote models, no external runtime assets, no provider APIs.
   The engine turns free-form creative briefs into deterministic scene graphs
   and renders cinematic 2D/2.5D shots that can be mixed with real media.
*/

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(s)=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rnd=(seed)=>{let x=(seed>>>0)+0x6D2B79F5;return()=>{x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return((x^(x>>>14))>>>0)/4294967296;};};
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

export function parseCreativeBrief(prompt=''){
 const p=String(prompt).toLowerCase();
 const has=(...xs)=>xs.some(x=>p.includes(x));
 let world='cinematic';
 if(has('minecraft','voxel','block world','blocky'))world='voxel';
 else if(has('gta','grand theft','crime game','open world crime'))world='urban-crime';
 else if(has('cyberpunk','neon city','futuristic city'))world='cyberpunk';
 else if(has('sci-fi','space','galaxy','alien','spaceship'))world='scifi';
 else if(has('fantasy','dragon','medieval','castle','magic'))world='fantasy';
 else if(has('western','cowboy','desert town'))world='western';
 else if(has('horror','zombie','haunted','creepy'))world='horror';
 else if(has('underwater','ocean','submarine'))world='underwater';
 else if(has('racing','race track','formula','motorsport'))world='racing';
 else if(has('jungle','rainforest'))world='jungle';
 else if(has('mars','red planet'))world='mars';
 const camera=has('fpv','first person')?'fpv':has('drone','aerial','overhead')?'aerial':has('chase','pursuit','follow')?'chase':has('orbit','360')?'orbit':has('close-up','closeup','macro')?'macro':'cinematic';
 const pace=has('fast','aggressive','action','chase','race','energetic','viral')?'fast':has('slow','emotional','dreamy','calm','beautiful')?'slow':'cinematic';
 const weather=has('rain','storm','wet')?'rain':has('snow','snowing','winter')?'snow':has('fog','mist')?'fog':has('dust','sandstorm')?'dust':'clear';
 const time=has('sunset','golden hour')?'sunset':has('sunrise','dawn')?'dawn':has('night','midnight','dark')?'night':'day';
 const intensity=has('epic','blockbuster','massive','spectacular','huge')?'epic':has('minimal','subtle','quiet')?'subtle':'cinematic';
 return {world,camera,pace,weather,time,intensity,subject:has('motorcycle','motorbike','bike','ninja','z1000','rider')?'motorcycle':has('car','vehicle')?'vehicle':has('person','rider','hero','character')?'character':'subject',original:true};
}

export function buildCreativeScenePlan(prompt='',opts={}){
 const brief=parseCreativeBrief(prompt); const seed=hash(`${prompt}|${opts.seed||0}`); const r=rnd(seed);
 const count=clamp(Number(opts.shots)||5,3,8);
 const roles=brief.pace==='fast'?['establish','approach','action','escalation','hero']:['establish','build','reveal','hero','outro'];
 const transitions=brief.pace==='fast'?['flash-cut','whip-right','hard-cut','zoom-punch']:['crossfade','dip-black','light-leak-right','crossfade'];
 const motions=brief.camera==='aerial'?['aerial-push','aerial-orbit','aerial-pull']:brief.camera==='chase'?['chase-follow','side-track','low-push','orbit']:['slow-push','pan-right','orbit','slow-pull'];
 const shots=Array.from({length:count},(_,i)=>({
   id:`scene-${i+1}`,role:roles[i%roles.length],duration:Number((brief.pace==='fast'?1.7+r()*1.1:2.1+r()*1.4).toFixed(2)),
   transition:i===0?'fade-in':transitions[(i-1)%transitions.length],motion:motions[i%motions.length],
   world:brief.world,weather:brief.weather,time:brief.time,subject:brief.subject,
   intensity:brief.intensity,seed:Math.floor(r()*1e9),prompt:String(prompt)
 }));
 return {version:1,seed,brief,shots,totalDuration:Number(shots.reduce((a,s)=>a+s.duration,0).toFixed(2)),local:true,provider:'none'};
}

function palette(world,time){
 const base={cinematic:['#07111a','#1b4051','#9bd8ee'],voxel:['#0a1522','#477b5a','#d9f3a2'], 'urban-crime':['#05060b','#17182a','#f4c46d'],cyberpunk:['#030414','#24104d','#35e7ff'],scifi:['#02040d','#11275b','#b9d8ff'],fantasy:['#07100d','#243c30','#f1c56a'],western:['#1b0e08','#744326','#ffd28a'],horror:['#030405','#16151b','#b6a0cf'],underwater:['#02131c','#064d62','#73e7e0'],racing:['#06080c','#20262d','#f0f0f0'],jungle:['#04100a','#18502f','#b9e68a'],mars:['#170707','#6b2418','#ffb06b']}[world]||['#07111a','#1b4051','#9bd8ee'];
 if(time==='night')return [base[0],base[1],base[2]];
 return base;
}

function sky(ctx,w,h,p,t){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,p[0]);g.addColorStop(.65,p[1]);g.addColorStop(1,p[1]);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);const x=w*(.25+.5*((Math.sin(t*.12)+1)/2)),y=h*.27;const glow=ctx.createRadialGradient(x,y,1,x,y,h*.28);glow.addColorStop(0,'rgba(255,255,255,.20)');glow.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);}

function voxel(ctx,w,h,t,r){
 const horizon=h*.54;ctx.fillStyle='#182a25';ctx.fillRect(0,horizon,w,h-horizon);
 for(let i=0;i<80;i++){const x=((i*97+t*18)% (w+120))-60;const z=(i%10)/10;const size=24+z*65;const y=horizon-size*(.3+.7*z);ctx.fillStyle=i%3?'#315943':'#416e52';ctx.fillRect(x,y,size,size);ctx.fillStyle='#6f9b62';ctx.fillRect(x,y,size,Math.max(2,size*.06));}
 for(let i=0;i<12;i++){const x=((i*151+t*42)%(w+160))-80;ctx.fillStyle='#263a2e';ctx.fillRect(x,horizon-70,34,70);ctx.fillStyle='#9ab66e';ctx.fillRect(x+8,horizon-58,18,12);}
}
function city(ctx,w,h,t,neon,crime){const horizon=h*.56;ctx.fillStyle='#090d13';ctx.fillRect(0,horizon,w,h-horizon);for(let i=0;i<28;i++){const x=((i*83+t*(crime?18:35))%(w+120))-60;const bw=30+(i*17%90),bh=70+(i*43%260);ctx.fillStyle=crime?(i%3?'#12131a':'#1d1820'):(i%2?'#10152c':'#1b0f2d');ctx.fillRect(x,horizon-bh,bw,bh);for(let q=0;q<7;q++){ctx.fillStyle=neon?(q%2?'rgba(45,230,255,.55)':'rgba(255,60,190,.48)'):'rgba(255,198,105,.35)';if((i+q)%3)ctx.fillRect(x+6+(q%3)*9,horizon-bh+12+q*22,5,8);}}for(let i=0;i<10;i++){const x=((i*121+t*90)%w);ctx.strokeStyle=neon?'rgba(60,230,255,.45)':'rgba(255,180,90,.25)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w/2,horizon);ctx.lineTo(x,h);ctx.stroke();}}
function terrain(ctx,w,h,world){const horizon=h*.58;ctx.fillStyle=world==='mars'?'#421b14':world==='western'?'#53301d':world==='fantasy'?'#18301e':'#10181b';ctx.fillRect(0,horizon,w,h-horizon);ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.moveTo(0,horizon+30);for(let x=0;x<=w;x+=40)ctx.lineTo(x,horizon+20+Math.sin(x*.018)*18);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();}
function racing(ctx,w,h,t){const horizon=h*.53;ctx.fillStyle='#121417';ctx.fillRect(0,horizon,w,h-horizon);ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=4;for(let i=-8;i<9;i++){ctx.beginPath();ctx.moveTo(w/2+i*4,horizon);ctx.lineTo(w/2+i*w*.17,h);ctx.stroke();}for(let q=1;q<10;q++){const y=horizon+Math.pow(q/10,1.7)*(h-horizon);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
function atmosphere(ctx,w,h,brief,t,r){ctx.save();ctx.globalCompositeOperation='screen';if(brief.weather==='rain'){for(let i=0;i<120;i++){const x=r()*w,y=(r()*h+t*(500+r()*300))%(h+80)-40;ctx.strokeStyle=`rgba(180,225,255,${.03+r()*.08})`;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-14,y+48);ctx.stroke();}}if(brief.weather==='snow'){for(let i=0;i<100;i++){const x=(r()*w+t*15)%w,y=(r()*h+t*25)%h;ctx.fillStyle=`rgba(255,255,255,${.2+r()*.5})`;ctx.fillRect(x,y,2+r()*3,2+r()*3);}}if(brief.weather==='fog'){const g=ctx.createLinearGradient(0,h*.4,0,h);g.addColorStop(0,'rgba(190,210,220,0)');g.addColorStop(1,'rgba(190,210,220,.18)');ctx.fillStyle=g;ctx.fillRect(0,h*.3,w,h*.7);}ctx.restore();}
function subject(ctx,w,h,brief,t,shot){const x=w*.5+Math.sin(t*.7+shot)*w*.12,y=h*.73,scale=.8+shot*.05;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);if(brief.subject==='motorcycle'){ctx.fillStyle='#050608';ctx.beginPath();ctx.ellipse(-45,38,25,25,0,0,Math.PI*2);ctx.ellipse(48,38,25,25,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6fc8ff';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-42,35);ctx.lineTo(-8,2);ctx.lineTo(28,12);ctx.lineTo(48,35);ctx.moveTo(-8,2);ctx.lineTo(10,-25);ctx.lineTo(28,12);ctx.stroke();ctx.fillStyle=brief.world==='voxel'?'#71a95e':brief.world==='cyberpunk'?'#35e7ff':'#2b6fd1';ctx.fillRect(-5,-18,35,22);ctx.fillStyle='#b9d8ff';ctx.fillRect(8,-38,13,20);}else{ctx.fillStyle='#090a0d';ctx.beginPath();ctx.ellipse(0,5,45,75,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d8d8d8';ctx.beginPath();ctx.arc(0,-58,24,0,Math.PI*2);ctx.fill();}ctx.restore();}
function grade(ctx,w,h,brief){const p=palette(brief.world,brief.time);ctx.fillStyle=`rgba(20,80,120,.08)`;ctx.fillRect(0,0,w,h);const v=ctx.createRadialGradient(w*.5,h*.48,h*.12,w*.5,h*.48,h*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.72,'rgba(0,0,0,.08)');v.addColorStop(1,'rgba(0,0,0,.7)');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);}

export async function renderCreativeScene({prompt='',duration=6,width=720,height=1280,fps=30,onProgress}={}){
 const plan=buildCreativeScenePlan(prompt,{shots:Math.max(3,Math.ceil(duration/1.6))});
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});
 const stream=canvas.captureStream(fps);const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)throw new Error('Browser cannot record a local creative scene.');
 const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Math.min(12000000,Math.max(4000000,width*height*7))});const chunks=[];recorder.ondataavailable=e=>e.data?.size&&chunks.push(e.data);const stopped=new Promise((resolve,reject)=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder.onerror=e=>reject(e.error||new Error('Creative scene recorder failed.'));});recorder.start(250);
 const total=Math.max(.5,Number(duration)||6);const start=performance.now();let frame=0;
 while(true){const elapsed=(performance.now()-start)/1000;if(elapsed>=total)break;const t=elapsed/total;const shotIndex=Math.min(plan.shots.length-1,Math.floor(t*plan.shots.length));const shot=plan.shots[shotIndex];const local=(t*plan.shots.length)%1;const r=rnd(shot.seed+frame);const brief=plan.brief;sky(ctx,width,height,palette(brief.world,brief.time),elapsed);if(brief.world==='voxel')voxel(ctx,width,height,elapsed,r);else if(brief.world==='urban-crime')city(ctx,width,height,elapsed,false,true);else if(brief.world==='cyberpunk')city(ctx,width,height,elapsed,true,false);else if(brief.world==='racing')racing(ctx,width,height,elapsed);else terrain(ctx,width,height,brief.world);if(brief.world==='scifi'){ctx.save();ctx.strokeStyle='rgba(100,210,255,.35)';for(let i=0;i<14;i++){ctx.beginPath();ctx.arc(width*.5,height*.52,80+i*55+Math.sin(elapsed+i)*8,Math.PI*1.05,Math.PI*1.95);ctx.stroke();}ctx.restore();}if(brief.world==='underwater'){ctx.save();for(let i=0;i<20;i++){ctx.strokeStyle=`rgba(90,220,220,${.08+r()*.12})`;ctx.beginPath();ctx.moveTo(i*width/20,height);ctx.quadraticCurveTo(i*width/20+40,height*.5,i*width/20+Math.sin(elapsed+i)*30,0);ctx.stroke();}ctx.restore();}subject(ctx,width,height,brief,elapsed,shotIndex);atmosphere(ctx,width,height,brief,elapsed,r);grade(ctx,width,height,brief);if(brief.intensity==='epic'){ctx.fillStyle=`rgba(255,255,255,${Math.max(0,1-Math.abs(local-.5)*5)*.05})`;ctx.fillRect(0,0,width,height);}frame++;onProgress?.(Math.round(Math.min(99,(elapsed/total)*100)));await new Promise(requestAnimationFrame);}
 recorder.stop();const blob=await stopped;onProgress?.(100);return {blob,plan,provider:'local-procedural',original:true};
}
