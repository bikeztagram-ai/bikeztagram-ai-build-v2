/* Bikeztagram AI — richer zero-cost stylised motorcycle scene renderer.
 * This is deterministic procedural animation, not generative AI or photorealistic 3D.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rand=(seed,n)=>{let x=(seed+n*374761393)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
function path(ctx,pts,fill,stroke,line=1){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function background(ctx,w,h,t,seed,shot){const horizon=h*(shot===0?.49:shot===1?.56:.52);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#050916');g.addColorStop(.42,'#171b35');g.addColorStop(1,'#05080e');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 const moon=ctx.createRadialGradient(w*.76,h*.18,2,w*.76,h*.18,w*.34);moon.addColorStop(0,'rgba(31,165,255,.35)');moon.addColorStop(1,'rgba(31,165,255,0)');ctx.fillStyle=moon;ctx.fillRect(0,0,w,h);
 for(let i=0;i<34;i++){const x=(i*97+t*(shot===1?70:18))%(w+100)-50,bh=70+rand(seed,i)*250,bw=22+rand(seed+4,i)*48;ctx.fillStyle=i%3?'#0c1425':'#15182b';ctx.fillRect(x,horizon-bh,bw,bh);for(let q=0;q<Math.floor(bh/22);q++){ctx.fillStyle=(i+q)%4===0?'rgba(37,180,255,.75)':'rgba(244,75,179,.35)';ctx.fillRect(x+5+(q%2)*12,horizon-bh+10+q*22,4,7);}}
 // perspective road with animated lane dashes
 path(ctx,[[w*.34,horizon],[w*.66,horizon],[w*1.3,h],[w*-.3,h]],'#10151e','#273449',2);
 for(let i=0;i<12;i++){const z=((i/12+t*.24)%1);const y=horizon+Math.pow(z,2)*(h-horizon);const half=(y-horizon)*.66;ctx.strokeStyle='rgba(40,174,255,'+(.05+z*.35)+')';ctx.lineWidth=1+z*4;ctx.beginPath();ctx.moveTo(w/2-half,y);ctx.lineTo(w/2+half,y);ctx.stroke();}
 for(let i=0;i<5;i++){const z=((i/5+t*.55)%1);const y=horizon+Math.pow(z,1.8)*(h-horizon);const dash=4+z*60;ctx.fillStyle='rgba(220,238,255,'+(.18+z*.45)+')';ctx.fillRect(w/2-dash/2,y,dash,Math.max(2,z*20));}
 // wet neon reflections
 const rg=ctx.createLinearGradient(0,horizon,0,h);rg.addColorStop(0,'rgba(15,156,255,0)');rg.addColorStop(1,'rgba(12,91,180,.22)');ctx.fillStyle=rg;ctx.fillRect(0,horizon,w,h-horizon);
 return horizon;}
function wheel(ctx,x,y,r,angle){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#020307';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#9aaab9';ctx.lineWidth=Math.max(2,r*.12);ctx.beginPath();ctx.arc(0,0,r*.78,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#3d5368';ctx.lineWidth=1.5;for(let i=0;i<10;i++){ctx.rotate(Math.PI/5);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,r*.72);ctx.stroke();}ctx.fillStyle='#c5d5e1';ctx.beginPath();ctx.arc(0,0,r*.19,0,Math.PI*2);ctx.fill();ctx.restore();}
function motorcycle(ctx,w,h,t,shot){ctx.save();const scale=shot===0?1.05:shot===1?.72:.9;ctx.translate(w*(shot===0?.5:shot===1?.52:.56),h*(shot===0?.73:shot===1?.72:.75));ctx.scale(scale,scale);
 const lean=shot===2?Math.sin(t*1.6)*.12:0;ctx.rotate(lean);
 // glow and ground shadow
 const glow=ctx.createRadialGradient(0,42,5,0,42,150);glow.addColorStop(0,'rgba(0,143,255,.36)');glow.addColorStop(1,'rgba(0,90,255,0)');ctx.fillStyle=glow;ctx.fillRect(-180,-100,360,220);
 ctx.fillStyle='rgba(0,0,0,.6)';ctx.beginPath();ctx.ellipse(0,55,130,28,0,0,Math.PI*2);ctx.fill();
 const r=shot===0?40:shot===1?31:35;wheel(ctx,-78,34,r,-t*3);wheel(ctx,78,34,r,-t*3.5);
 // swingarm, chassis, exhaust and engine
 path(ctx,[[-78,30],[-18,-2],[33,24],[78,31],[42,43],[-45,40]],'#566473','#141c27',4);
 rounded(ctx,-26,7,56,38,8,'#303b48','#111925');rounded(ctx,-13,14,26,22,5,'#77818b','#27313e');
 // exhaust
 ctx.save();ctx.rotate(-.08);rounded(ctx,18,27,56,10,5,'#657687','#a8c0d2');ctx.restore();
 // signature candy-blue tank and angular side fairings
 path(ctx,[[-36,-14],[-18,-37],[14,-34],[42,-14],[33,4],[8,13],[-23,5]],'#075fc8','#56b7ff',3);
 path(ctx,[[-40,-12],[-67,-5],[-82,12],[-62,20],[-27,16],[-12,4]],'#0b3e8e','#4daeff',3);
 path(ctx,[[-67,-5],[-54,-25],[-26,-34],[-16,-19],[-34,-11]],'#0877ed','#62c8ff',2);
 path(ctx,[[13,-32],[39,-29],[57,-8],[49,7],[32,4],[29,-12]],'#062d68','#45aaff',3);
 // white-blue LED headlamp and highlights
 path(ctx,[[44,-17],[55,-12],[52,-4],[43,-8]],'#eafaff','#7be4ff',2);
 ctx.strokeStyle='rgba(170,224,255,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-49,-13);ctx.lineTo(-29,-27);ctx.lineTo(-9,-30);ctx.stroke();
 // handlebars/mirrors
 ctx.strokeStyle='#b5c6d5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(17,-32);ctx.lineTo(28,-46);ctx.lineTo(53,-43);ctx.stroke();ctx.beginPath();ctx.moveTo(53,-43);ctx.lineTo(62,-50);ctx.stroke();
 // rider legs and arms, dark riding suit
 path(ctx,[[-17,-40],[-2,-53],[14,-37],[4,-14],[-12,-6],[-25,-17]],'#101722','#536579',3);
 path(ctx,[[-12,-9],[10,-9],[35,21],[20,29],[-1,12],[-29,13]],'#101722','#455b70',3);
 // boot
 path(ctx,[[15,23],[36,23],[43,31],[18,34]],'#06090e','#718091',2);
 // torso leaning forward
 path(ctx,[[-24,-76],[-7,-91],[16,-79],[28,-53],[10,-39],[-17,-48]],'#0a1423','#5b7086',3);
 path(ctx,[[-21,-71],[-8,-83],[6,-77],[-1,-56],[-16,-54]],'#0758b4','#2d8fff',2);
 // arms to controls
 path(ctx,[[13,-70],[31,-55],[52,-43],[48,-36],[25,-48],[5,-55]],'#101722','#52667c',4);
 // helmet
 ctx.fillStyle='#070b13';ctx.beginPath();ctx.ellipse(-5,-99,22,24,-.25,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#138fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(-5,-99,20,-.8,1.8);ctx.stroke();rounded(ctx,3,-104,17,8,3,'#b5efff','#168bff');
 // rear light and blue underglow
 ctx.fillStyle='#ff254d';ctx.shadowColor='#ff1744';ctx.shadowBlur=16;ctx.fillRect(-81,4,10,5);ctx.shadowBlur=0;
 ctx.restore();}
function overlay(ctx,w,h,t,shot,prompt){const v=ctx.createRadialGradient(w/2,h*.45,h*.2,w/2,h*.45,h*.78);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.65)');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
 // intentional title card-like in-world HUD to give game capture style
 ctx.fillStyle='rgba(2,8,18,.66)';ctx.fillRect(24,30,w-48,64);ctx.strokeStyle='rgba(36,166,255,.65)';ctx.strokeRect(24,30,w-48,64);ctx.fillStyle='#f2f8ff';ctx.font='bold 20px system-ui';ctx.fillText('NIGHT RUN  //  OPEN WORLD',40,57);ctx.fillStyle='#5dc5ff';ctx.font='12px system-ui';ctx.fillText(['01  CITY APPROACH','02  CHASE CAM','03  HERO CORNER'][shot],40,79);
 ctx.fillStyle='rgba(5,10,20,.6)';ctx.fillRect(24,h-70,w-48,38);ctx.fillStyle='#69cfff';ctx.font='bold 12px system-ui';ctx.fillText('KAWASAKI  •  CANDY BLUE  •  1000SX',36,h-46);
}
export async function renderDetailedGameScene({prompt='',duration=8,width=720,height=1280,fps=24,onProgress}={}){
 if(typeof document==='undefined'||typeof MediaRecorder==='undefined')throw new Error('This browser does not support local video recording. Open Bikeztagram in a current Chrome browser.');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Could not initialise the local scene canvas.');
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)throw new Error('This browser cannot encode WebM video.');
 const seed=hash(prompt);const stream=canvas.captureStream(fps);const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Math.min(9000000,Math.max(3500000,width*height*4))});const chunks=[];recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
 const done=new Promise((resolve,reject)=>{recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());resolve(new Blob(chunks,{type:mime}));};recorder.onerror=e=>reject(e.error||new Error('Local scene recording failed.'));});
 const total=clamp(Number(duration)||8,3,15);let start=0,raf=0;recorder.start(200);
 await new Promise((resolve,reject)=>{const draw=now=>{if(!start)start=now;const elapsed=(now-start)/1000;if(elapsed>=total){recorder.stop();resolve();return;}const p=elapsed/total;const shot=Math.min(2,Math.floor(p*3));const local=(p*3)%1;const h=background(ctx,width,height,elapsed,seed,shot);if(shot===0){ctx.save();ctx.translate(Math.sin(elapsed*1.1)*width*.018,0);motorcycle(ctx,width,height,elapsed,shot);ctx.restore();}else if(shot===1){motorcycle(ctx,width,height,elapsed,shot); // speed streaks
 ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle='#59c8ff';for(let i=0;i<18;i++){const y=(rand(seed+22,i)*height+elapsed*600)%(height+80);ctx.lineWidth=1+rand(seed+31,i)*3;ctx.beginPath();ctx.moveTo(rand(seed+41,i)*width,y);ctx.lineTo(rand(seed+51,i)*width,y+30+rand(seed+61,i)*90);ctx.stroke();}ctx.restore();}else{motorcycle(ctx,width,height,elapsed,shot);ctx.save();ctx.translate(width*.5,height*.72);ctx.rotate(Math.sin(elapsed*1.4)*.035);ctx.restore();}
 overlay(ctx,width,height,elapsed,shot,prompt);onProgress?.({stage:'creative-scene',value:Math.round(p/1*100),shot:shot+1,totalShots:3,world:'urban'});raf=requestAnimationFrame(draw);};raf=requestAnimationFrame(draw);});
 await done;return done;
}
