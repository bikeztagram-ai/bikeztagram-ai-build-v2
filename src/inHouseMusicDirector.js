// Bikeztagram AI — in-house original Music Director/runtime.
// Deterministic, provider-free composition planning and WAV synthesis helpers.
const SCALES={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10]};
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const hz=(m)=>440*Math.pow(2,(m-69)/12);
export function directOriginalMusic({request='',duration=15,mood='cinematic',energy=.65,bpm=110,key=45,scale='minor'}={}){
 const safeBpm=Math.max(60,Math.min(180,Number(bpm)||110)); const bars=Math.max(1,Math.ceil(Number(duration)*safeBpm/60/4)); const notes=SCALES[scale]||SCALES.minor;
 const sections=[{name:'intro',bars:Math.max(1,Math.floor(bars*.2)),energy:clamp(energy*.55)},{name:'build',bars:Math.max(1,Math.floor(bars*.25)),energy:clamp(energy*.8)},{name:'drop',bars:Math.max(1,Math.floor(bars*.25)),energy:clamp(Math.min(1,energy+ .2))},{name:'hero',bars:Math.max(1,Math.floor(bars*.2)),energy:clamp(energy)},{name:'outro',bars:Math.max(1,bars-Math.floor(bars*.9)),energy:clamp(energy*.45)}];
 let cursor=0; const events=[]; sections.forEach((s,si)=>{for(let b=0;b<s.bars;b++){for(let beat=0;beat<4;beat++){const t=cursor+(b*4+beat)*60/safeBpm; events.push({time:Number(t.toFixed(4)),type:'beat',section:s.name,bar:b+1,beat:beat+1,accent:beat===0||s.name==='drop'}); if(si>=1&&beat%2===0)events.push({time:Number(t.toFixed(4)),type:'bass',midi:key+notes[(b+beat+si)%notes.length],velocity:.35+s.energy*.5}); if(si>=2&&beat===0)events.push({time:Number(t.toFixed(4)),type:'impact',midi:key+12,velocity:s.energy});}} cursor+=s.bars*4*60/safeBpm;});
 return {type:'original-music',request,duration:Number(duration),bpm:safeBpm,key,scale,mood,energy:clamp(energy),sections,events,originalOnly:true};
}
export function synthesizeOriginalWav(plan,{sampleRate=22050}={}){
 const length=Math.max(1,Math.ceil(plan.duration*sampleRate)); const pcm=new Float32Array(length); const add=(at,freq,amp,len)=>{const start=Math.max(0,Math.floor(at*sampleRate)),count=Math.min(Math.floor(len*sampleRate),length-start);for(let i=0;i<count;i++){const env=Math.min(1,i/(sampleRate*.01), (count-i)/(sampleRate*.08)); pcm[start+i]+=Math.sin(2*Math.PI*freq*i/sampleRate)*amp*env;}};
 for(const e of plan.events||[]){if(e.type==='bass')add(e.time,hz(e.midi),.08+e.velocity*.08,.18); if(e.type==='impact')add(e.time,55,.18,.22); if(e.type==='beat')add(e.time,160,.025,.035);}
 let peak=0;for(const v of pcm)peak=Math.max(peak,Math.abs(v));const gain=peak>.95?.95/peak:1;const bytes=new ArrayBuffer(44+length*2),dv=new DataView(bytes);const w=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i));};w(0,'RIFF');dv.setUint32(4,36+length*2,true);w(8,'WAVE');w(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,sampleRate,true);dv.setUint32(28,sampleRate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);w(36,'data');dv.setUint32(40,length*2,true);for(let i=0;i<length;i++)dv.setInt16(44+i*2,Math.max(-32768,Math.min(32767,pcm[i]*gain*32767)),true);return new Blob([bytes],{type:'audio/wav'});
}
export function musicToCutEvents(plan){return (plan.events||[]).filter(e=>e.type==='beat').map(e=>({time:e.time,section:e.section,accent:e.accent}));}
