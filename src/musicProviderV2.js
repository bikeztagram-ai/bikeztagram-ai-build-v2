/* Original local soundtrack runtime. No external audio is downloaded or copied. */
const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), frac=v=>v-Math.floor(v), hash=n=>frac(Math.sin(n*12.9898+78.233)*43758.5453), midi=m=>440*Math.pow(2,(m-69)/12), noise=n=>hash(n)*2-1;
const GENRE_PROFILES={
  'hard-rock':{motif:[40,40,43,47,45,43,40,38],lead:[64,67,71,69,67,64,62,59],kick:1.18,snare:1.08,hat:1.02,pluck:1.12,pad:.62},
  rock:{motif:[40,43,45,47,45,43,40,38],lead:[64,67,69,71,69,67,64,60],kick:1.08,snare:1.04,hat:.94,pluck:1.02,pad:.72},
  'hip-hop':{motif:[36,36,39,43,41,39,36,34],lead:[60,63,67,65,63,60,58,55],kick:1.22,snare:.92,hat:1.18,pluck:.78,pad:.62},
  pop:{motif:[45,45,48,52,50,48,45,43],lead:[69,72,76,74,72,69,67,64],kick:1.02,snare:1.0,hat:1.0,pluck:1.05,pad:.9},
  electronic:{motif:[38,41,45,48,45,41,38,36],lead:[62,65,69,72,69,65,62,58],kick:1.18,snare:.88,hat:1.22,pluck:1.18,pad:1.0},
  edm:{motif:[38,41,45,50,48,45,41,38],lead:[62,65,69,74,72,69,65,60],kick:1.28,snare:.9,hat:1.28,pluck:1.24,pad:.92},
  trance:{motif:[38,41,45,48,50,48,45,41],lead:[62,65,69,72,74,72,69,65],kick:1.3,snare:.82,hat:1.3,pluck:1.3,pad:1.05},
  house:{motif:[38,38,41,45,43,41,38,36],lead:[62,65,69,67,65,62,60,57],kick:1.3,snare:.78,hat:1.22,pluck:1.12,pad:1.0},
  cinematic:{motif:[38,41,43,45,43,41,38,36],lead:[62,65,67,69,67,65,62,59],kick:.96,snare:.88,hat:.72,pluck:.84,pad:1.18},
  ambient:{motif:[38,41,45,43,41,38,36,34],lead:[62,65,69,67,65,62,60,57],kick:.68,snare:.54,hat:.5,pluck:.62,pad:1.35},
  acoustic:{motif:[40,43,45,47,45,43,40,38],lead:[64,67,69,71,69,67,64,60],kick:.82,snare:.9,hat:.78,pluck:.98,pad:.86},
  indie:{motif:[40,43,47,45,43,40,38,36],lead:[64,67,71,69,67,64,62,59],kick:.92,snare:.98,hat:.9,pluck:1.04,pad:.8},
  orchestral:{motif:[38,41,43,46,43,41,38,34],lead:[62,65,67,70,67,65,62,58],kick:.78,snare:.7,hat:.42,pluck:.58,pad:1.32}
};
function text(v){return String(v??'').trim().toLowerCase();}
function hashText(v){let h=2166136261;for(const ch of text(v)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rotate(values,offset){const n=values.length;const o=((offset%n)+n)%n;return values.slice(o).concat(values.slice(0,o));}
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

export function buildMusicProfile({genre='cinematic',mood='cinematic',prompt=''}={}){
 const key=text(genre)||'cinematic',base=GENRE_PROFILES[key]||GENRE_PROFILES.cinematic,seed=hashText(`${key}|${mood}|${prompt}`),rotation=seed%base.motif.length,transpose=text(mood).includes('dark')?-2:text(mood).includes('uplifting')?2:0;
 return{version:'procedural-cinematic-v2',genre:key,mood:text(mood)||'cinematic',seed,profileId:`${key}-${seed.toString(16)}`,motif:rotate(base.motif,rotation).map(n=>n+transpose),lead:rotate(base.lead,(seed>>4)%base.lead.length).map(n=>n+transpose),mix:{kick:base.kick,snare:base.snare,hat:base.hat,pluck:base.pluck,pad:base.pad}};
}

export function createOriginalCinematicWav({seconds=15,bpm=112,energy=.78,genre='cinematic',mood='cinematic',prompt=''}={}){
 const profile=buildMusicProfile({genre,mood,prompt}),rate=44100,total=clamp(Number(seconds)||15,5,60),safeBpm=clamp(Number(bpm)||112,70,150),beat=60/safeBpm,half=beat/2,bar=beat*4,frames=Math.floor(total*rate),samples=new Float32Array(frames),motif=profile.motif,lead=profile.lead,drops=[bar*2,bar*4,bar*6].filter(t=>t<total-.15),master=clamp(Number(energy)||.78,.2,1);
 for(let i=0;i<frames;i++){const t=i/rate,bi=Math.floor(t/beat),hb=Math.floor(t/half),bb=bi%4,barI=Math.floor(t/bar),local=(t%beat)/beat,halfPos=t%half;let s=0;const phaseEnergy=t<bar*1.5 ? .6 : t<bar*3 ? .82 : t<bar*5 ? .95 : 1;const e=clamp(master*phaseEnergy,.15,1);
  if(local<.16){s+=bass(t%beat,motif[(barI*2+bb)%motif.length],e*profile.mix.kick);s+=kick(t%beat)*(bb===0?1.12:.86)*profile.mix.kick;}
  if(bb===1||bb===3)s+=snare(t%beat,bi)*e*profile.mix.snare;
  if(halfPos<.035)s+=hat(halfPos,hb)*(hb%8===7?1.55:hb%2?.72:.48)*e*profile.mix.hat;
  if(t>=bar*1.5&&halfPos<.05)s+=pluck(halfPos,lead[(hb+barI)%lead.length]+(t>=bar*5?12:0),e*(t>=bar*3?1.2:.82)*profile.mix.pluck);
  const cs=Math.floor(t/(bar*2))*(bar*2),ct=t-cs;if(ct<bar*1.85)s+=pad(ct,[50,46,43,48][Math.floor(t/(bar*2))%4],e*profile.mix.pad);
  for(const d of drops){const pre=Math.min(1.15,bar*.9);if(t>=d-pre&&t<d)s+=riser(t-(d-pre),pre,1);const dt=t-d;if(dt>=0&&dt<.65)s+=impact(dt,1);}
  s+=Math.sin(TAU*.31*t)*.012*e;samples[i]=s;
 }
 let peak=0;for(const s of samples)peak=Math.max(peak,Math.abs(s));const gain=peak?Math.min(1.65,.89/peak):1;for(let i=0;i<samples.length;i++)samples[i]=Math.tanh(samples[i]*gain*1.12)/Math.tanh(1.12);return writeWav(samples,rate);
}

export function createMusicRuntimeFallback(request={}){return{source:'local-original',audioBlob:createOriginalCinematicWav({seconds:request.duration||15,bpm:request.bpm||112,energy:request.energy||.78,genre:request.genre||'cinematic',mood:request.mood||'cinematic',prompt:request.prompt||''}),metadata:{original:true,model:'procedural-cinematic-v2',bpm:request.bpm||112,duration:request.duration||15,genre:request.genre||'cinematic',mood:request.mood||'cinematic'}};}
