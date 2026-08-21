/* Original local soundtrack runtime. No external audio is downloaded or copied. */
const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), frac=v=>v-Math.floor(v), hash=n=>frac(Math.sin(n*12.9898+78.233)*43758.5453), midi=m=>440*Math.pow(2,(m-69)/12), noise=n=>hash(n)*2-1;
function env(t,a,d,s,r,len){if(t<0||t>=len+r)return 0;if(t<a)return t/Math.max(a,.0001);if(t<a+d)return 1-(1-s)*(t-a)/Math.max(d,.0001);if(t<len)return s;return s*(1-(t-len)/Math.max(r,.0001));}
function kick(t){if(t<0||t>.34)return 0;const e=Math.exp(-t*14),f=42+78*Math.exp(-t*24);return Math.sin(TAU*f*t)*e*.82;}
function snare(t,seed){if(t<0||t>.22)return 0;const e=Math.exp(-t*22);return(Math.sin(TAU*185*t)*Math.exp(-t*19)*.22+noise(Math.floor(t*44100)+seed*97)*e*.38)*.82;}
function hat(t,seed){if(t<0||t>.07)return 0;return noise(Math.floor(t*44100)+seed*131)*Math.exp(-t*65)*.13;}
function bass(t,note,accent=1){if(t<0||t>.48)return 0;const f=midi(note),e=env(t,.008,.07,.52,.09,.38);return(Math.sin(TAU*f*t)*.26+Math.sin(TAU*f*2*t)*.09)*e*accent;}
function pluck(t,note,accent=1){if(t<0||t>.5)return 0;const f=midi(note),e=env(t,.003,.08,.08,.24,.13),saw=2*frac(f*t)-1;return(Math.sin(TAU*f*t)*.65+saw*.22+Math.sin(TAU*f*2*t)*.16)*e*.16*accent;}
function pad(t,root,energy){if(t<0||t>2.2)return 0;const e=env(t,.25,.35,.7,.55,1.45),f=midi(root),sh=Math.sin(TAU*f*1.5*t)*.18+Math.sin(TAU*f*2.01*t)*.12;return(Math.sin(TAU*f*t)*.11+sh)*e*(.55+energy*.45);}
function riser(t,len,energy){if(t<0||t>len)return 0;const p=clamp(t/len,0,1),f=220+1800*p*p;return Math.sin(TAU*f*t)*Math.pow(p,2.8)*(.05+energy*.07);}
function impact(t,energy){if(t<0||t>.65)return 0;const e=Math.exp(-t*8),low=Math.sin(TAU*(48+22*Math.exp(-t*15))*t)*e*.58,air=noise(Math.floor(t*44100)+901)*Math.exp(-t*28)*.20;return(low+air)*(.75+energy*.25);}
function writeWav(samples,rate){const size=samples.length*2,buf=new ArrayBuffer(44+size),v=new DataView(buf),w=(o,x)=>v.setUint32(o,x,true),w16=(o,x)=>v.setUint16(o,x,true);w(0,0x46464952);w(4,36+size);w(8,0x45564157);w(12,0x20746d66);w(16,16);w16(20,1);w16(22,1);w(24,rate);w(28,rate*2);w16(32,2);w16(34,16);w(36,0x61746164);w(40,size);for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,clamp(samples[i],-1,1)*32767,true);return new Blob([buf],{type:'audio/wav'});}

export function createOriginalCinematicWav({seconds=15,bpm=112,energy=.78}={}){
 const rate=44100,total=clamp(Number(seconds)||15,5,60),safeBpm=clamp(Number(bpm)||112,70,150),beat=60/safeBpm,half=beat/2,bar=beat*4,frames=Math.floor(total*rate),samples=new Float32Array(frames),motif=[38,38,41,45,43,41,38,36],lead=[62,65,69,67,65,62,60,57],drops=[bar*2,bar*4,bar*6].filter(t=>t<total-.15),master=clamp(Number(energy)||.78,.2,1);
 for(let i=0;i<frames;i++){const t=i/rate,bi=Math.floor(t/beat),hb=Math.floor(t/half),bb=bi%4,barI=Math.floor(t/bar),local=(t%beat)/beat,halfPos=t%half;let s=0;const phaseEnergy=t<bar*1.5 ? 0.6 : t<bar*3 ? 0.82 : t<bar*5 ? 0.95 : 1;const e=clamp(master*phaseEnergy,.15,1);
  if(local<.16){s+=bass(t%beat,motif[(barI*2+bb)%motif.length],e);s+=kick(t%beat)*(bb===0?1.12:.86);}
  if(bb===1||bb===3)s+=snare(t%beat,bi)*e;
  if(halfPos<.035)s+=hat(halfPos,hb)*(hb%8===7?1.55:hb%2?.72:.48)*e;
  if(t>=bar*1.5&&halfPos<.05)s+=pluck(halfPos,lead[(hb+barI)%lead.length]+(t>=bar*5?12:0),e*(t>=bar*3?1.2:.82));
  const cs=Math.floor(t/(bar*2))*(bar*2),ct=t-cs;if(ct<bar*1.85)s+=pad(ct,[50,46,43,48][Math.floor(t/(bar*2))%4],e);
  for(const d of drops){const pre=Math.min(1.15,bar*.9);if(t>=d-pre&&t<d)s+=riser(t-(d-pre),pre,1);const dt=t-d;if(dt>=0&&dt<.65)s+=impact(dt,1);}
  s+=Math.sin(TAU*.31*t)*.012*e;samples[i]=s;
 }
 let peak=0;for(const s of samples)peak=Math.max(peak,Math.abs(s));const gain=peak?Math.min(1.65,.89/peak):1;for(let i=0;i<samples.length;i++)samples[i]=Math.tanh(samples[i]*gain*1.12)/Math.tanh(1.12);return writeWav(samples,rate);
}

export function createMusicRuntimeFallback(request={}){return{source:'local-original',audioBlob:createOriginalCinematicWav({seconds:request.duration||15,bpm:request.bpm||112,energy:request.energy||.78}),metadata:{original:true,model:'procedural-cinematic-v2',bpm:request.bpm||112,duration:request.duration||15}};}
