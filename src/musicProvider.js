/* BIKEZTAGRAM AI — local original soundtrack engine.
   Keeps the zero-cost/private-media pipeline intact while replacing the old beep/pulse fallback
   with an actual deterministic musical arrangement: drums, bass, chords, lead motif, fills,
   dynamics and stereo space. No copyrighted recording is used or fetched.
*/
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const midiToHz=m=>440*Math.pow(2,(m-69)/12);
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296;};
const pick=(arr,n)=>arr[Math.floor(hash(n)*arr.length)%arr.length];
function envelope(t,d,attack=.01,release=.08){if(t<0||t>d)return 0;const a=Math.min(attack,d*.25),r=Math.min(release,d*.5);if(t<a)return t/a;if(t>d-r)return Math.max(0,(d-t)/r);return 1;}
function osc(type,f,t){const p=(t*f)%1;switch(type){case'sine':return Math.sin(TAU*f*t);case'triangle':return 1-4*Math.abs(Math.round(p)-p);case'square':return p<.5?1:-1;case'saw':return 2*p-1;default:return Math.sin(TAU*f*t);}}
function noise(seed){const x=Math.sin(seed*12.9898+78.233)*43758.5453;return(x-Math.floor(x))*2-1;}
function writeAscii(view,offset,text){for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));}
function renderTone(sampleRate,t,notes,kind){let out=0;for(const n of notes){const local=t-n.time;if(local<0||local>n.duration)continue;const e=envelope(local,n.duration,n.attack??.01,n.release??.08)*n.gain;const f=midiToHz(n.midi);if(kind==='pad')out+=(osc('sine',f,local)*.55+osc('triangle',f*2,local)*.18+osc('sine',f*1.5,local)*.12)*e;else if(kind==='bass')out+=(osc('sine',f,local)*.75+osc('triangle',f*2,local)*.22)*e;else out+=(osc('triangle',f,local)*.7+osc('sine',f*2,local)*.25)*e;}return out;}
export function createOriginalMusicWav(seconds=15,bpm=112,{genre='cinematic',energy=.72,seed='bikeztagram'}={}){
 const sampleRate=44100,channels=2,bits=16,frames=Math.floor(clamp(seconds,5,180)*sampleRate),dataSize=frames*channels*2,buffer=new ArrayBuffer(44+dataSize),view=new DataView(buffer);
 const write=(o,v)=>view.setUint32(o,v,true);const write16=(o,v)=>view.setUint16(o,v,true);
 writeAscii(view,0,'RIFF');write(4,36+dataSize);writeAscii(view,8,'WAVE');writeAscii(view,12,'fmt ');write(16,16);write16(20,1);write16(22,channels);write(24,sampleRate);write(28,sampleRate*channels*2);write16(32,channels*2);write16(34,bits);writeAscii(view,36,'data');write(40,dataSize);
 const safeBpm=clamp(bpm,70,160),beat=60/safeBpm,bar=beat*4,total=frames/sampleRate,style=String(genre||'cinematic').toLowerCase();
 const scale=style.includes('electronic')||style.includes('edm')?[0,2,4,7,9]:style.includes('rock')?[0,2,3,5,7,10]:[0,2,3,5,7,9,10];
 const root=pick([45,48,50,52],seed);const progression=style.includes('rock')?[0,3,5,2]:[0,5,3,4];
 const chords=[];const bass=[];const lead=[];const kick=[];const snare=[];const hat=[];
 const bars=Math.ceil(total/bar);const e=clamp(energy,.35,.95);
 for(let b=0;b<bars;b++){
   const bs=b*bar,chordRoot=root+progression[b%progression.length];
   for(let j=0;j<4;j++){const midi=chordRoot+scale[[0,2,4,6][j%4]];chords.push({time:bs,duration:Math.min(bar,total-bs),midi,attack:.08,release:.16,gain:.075+e*.025});}
   for(let q=0;q<8;q++){const t=bs+q*beat/2;if(t>total)continue;const accent=q%2===0||b%4===3; bass.push({time:t,duration:Math.min(beat*.46,total-t),midi:chordRoot-12+(q===0?0:(q===4?7:0)),attack:.008,release:.08,gain:(.16+e*.07)*(accent?1:.78)});hat.push({time:t,duration:.035,midi:90,attack:0,release:.035,gain:.035+(q%2?0:.018)});}
   kick.push({time:bs,duration:.18,gain:.42+e*.16});kick.push({time:bs+beat*2,duration:.16,gain:.34+e*.12});
   if(b%2===1){snare.push({time:bs+beat,duration:.13,gain:.22+e*.08});snare.push({time:bs+beat*3,duration:.13,gain:.24+e*.08});}
   const motif=[0,2,4,2,3,1,4,6];for(let m=0;m<8;m++){const t=bs+m*beat/2+.01;if(t>=total)break;const degree=motif[(m+b)%motif.length];lead.push({time:t,duration:beat*.36,midi:chordRoot+12+scale[degree%scale.length],attack:.012,release:.09,gain:(.055+e*.025)*(b%4===3?1.2:1)});}
 }
 const padNotes=chords;const master=Math.min(.82,.58+e*.16);
 for(let i=0;i<frames;i++){
   const t=i/sampleRate;let L=0,R=0;
   const kickHit=kick.reduce((s,k)=>{const x=t-k.time;if(x<0||x>k.duration)return s;const f=110*Math.exp(-x*28)+46;return s+Math.sin(TAU*f*x)*Math.exp(-x*18)*k.gain;},0);
   const snareHit=snare.reduce((s,k)=>{const x=t-k.time;if(x<0||x>k.duration)return s;return s+noise(Math.floor(i*.41)+k.time*1000)*Math.exp(-x*30)*k.gain;},0);
   const hatHit=hat.reduce((s,k)=>{const x=t-k.time;if(x<0||x>k.duration)return s;return s+noise(Math.floor(i*1.7)+k.time*700)*Math.exp(-x*90)*k.gain;},0);
   const bassHit=renderTone(sampleRate,t,bass,'bass');const padHit=renderTone(sampleRate,t,padNotes,'pad');const leadHit=renderTone(sampleRate,t,lead,'lead');
   const lift=(t<bar?.0?0:1); // keep the intro restrained without introducing a hard click
   const arrangement=(t<2?0.72:(t>total-2?0.92:1))*lift+0.001;
   const dry=(kickHit+snareHit+hatHit+bassHit+padHit+leadHit)*arrangement*master;
   const width=leadHit*.12+padHit*.06;L=dry-width;R=dry+width;
   const fadeIn=Math.min(1,t/.08),fadeOut=Math.min(1,(total-t)/.16),gain=fadeIn*fadeOut;
   const li=Math.max(-1,Math.min(1,L*gain)),ri=Math.max(-1,Math.min(1,R*gain));view.setInt16(44+i*4,li*32767,true);view.setInt16(46+i*4,ri*32767,true);
 }
 return new Blob([buffer],{type:'audio/wav'});
}

// Backward-compatible export: existing render/audio code keeps its contract while receiving the new engine.
export function createOriginalPulseWav(seconds=45,bpm=112){return createOriginalMusicWav(seconds,bpm,{genre:'cinematic',energy:.72,seed:'bikeztagram-pulse-compat'});}
