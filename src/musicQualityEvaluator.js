const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dbfs=x=>x>0?20*Math.log10(x):-Infinity;
const rms=a=>a.length?Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length):0;
const peak=a=>a.reduce((m,x)=>Math.max(m,Math.abs(x)),0);
const pct=(a,p)=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return s[l]+(s[h]-s[l])*(i-l)};
const frames=(a,n)=>{const out=[],size=Math.max(256,n*.4);for(let i=0;i+size<=a.length;i+=size){const f=a.subarray(i,i+size);out.push(rms(f))}return out};
const centroid=(a,sr)=>{const n=Math.min(512,a.length),step=Math.max(1,Math.floor(a.length/n));if(n<16)return 0;let w=0,m=0;for(let k=1;k<n/2;k++){let re=0,im=0;for(let i=0;i<n;i++){const x=(a[i*step]||0)*(0.5-0.5*Math.cos(2*Math.PI*i/(n-1))),p=2*Math.PI*k*i/n;re+=x*Math.cos(p);im-=x*Math.sin(p)}const z=Math.hypot(re,im);w+=(k*sr/n)*z;m+=z}return m?w/m:0};
const band=(a,sr,lo,hi)=>{const n=Math.min(a.length,32768),step=Math.max(1,Math.floor(a.length/n));let e=0,c=0;for(let i=0;i<a.length;i+=step){const f=sr*((i+1)%2048)/2048;if(f>=lo&&f<hi){e+=a[i]*a[i];c++}}return c?e/c:0};

/** Browser-local technical audio QA. Loudness is an energy approximation, not certified EBU R128. */
export function analyseMusicAudio({channels,sampleRate,durationSeconds}){
 if(!Array.isArray(channels)||!channels.length||!sampleRate)throw new Error('Audio channels and sampleRate are required.');
 const len=Math.max(...channels.map(c=>c.length)),mono=new Float32Array(len);
 for(let i=0;i<len;i++){let s=0,c=0;for(const ch of channels)if(i<ch.length){s+=ch[i];c++}mono[i]=c?s/c:0}
 const r=rms(mono),p=peak(mono),fs=frames(mono,sampleRate),db=fs.filter(x=>x>0).map(dbfs),loud=db.length?10*Math.log10(db.reduce((s,x)=>s+10**(x/10),0)/db.length):-Infinity;
 const dyn=db.length?pct(db,.95)-pct(db,.1):0,crest=r?20*Math.log10(p/r):Infinity,sil=fs.length?fs.filter(x=>x<.003).length/fs.length:0;
 const low=band(mono,sampleRate,20,180),mid=band(mono,sampleRate,180,1000),high=band(mono,sampleRate,4000,12000);
 let corr=1,width=0;if(channels.length>1){const L=channels[0],R=channels[1],n=Math.min(L.length,R.length);let lr=0,ll=0,rr=0;for(let i=0;i<n;i++){lr+=L[i]*R[i];ll+=L[i]*L[i];rr+=R[i]*R[i]}corr=ll&&rr?clamp(lr/Math.sqrt(ll*rr),-1,1):1;width=1-Math.max(0,corr)}
 const issues=[];if(dbfs(p)>-.1)issues.push('true-peak-risk');if(loud<-24)issues.push('too-quiet');if(loud>-7)issues.push('over-dense-master');if(dyn<3)issues.push('low-dynamic-contrast');if(sil>.2&&(durationSeconds??len/sampleRate)>10)issues.push('excessive-silence');if(corr<-.15)issues.push('phase-risk');if(mid&&low/mid>3.5)issues.push('low-end-dominant');if(mid&&high/mid>1.8)issues.push('high-frequency-dominant');
 const scores={loudness:clamp(100-Math.max(0,-24-loud)*3-Math.max(0,loud+7)*4,0,100),dynamics:clamp(dyn*12,0,100),headroom:clamp((-.1-dbfs(p))*80+90,0,100),stereo:clamp(100-Math.max(0,-.15-corr)*180,0,100),tonalBalance:clamp(100-Math.abs(Math.log10(Math.max(low/(mid||1),.001))-.05)*28-Math.abs(Math.log10(Math.max(high/(mid||1),.001))+.35)*18,0,100)};
 const technicalScore=Math.round(scores.loudness*.2+scores.dynamics*.2+scores.headroom*.2+scores.stereo*.15+scores.tonalBalance*.25);
 return {version:'music-audio-quality-v1',metrics:{durationSeconds:durationSeconds??len/sampleRate,channels:channels.length,sampleRate,peakDbfs:dbfs(p),rmsDbfs:dbfs(r),integratedLoudnessDb:loud,crestDb:crest,dynamicDb:dyn,silenceRatio:sil,centroidHz:centroid(mono,sampleRate),lowMidRatio:mid?low/mid:0,highMidRatio:mid?high/mid:0,stereoCorrelation:corr,stereoWidthProxy:width},scores,technicalScore,issues,verdict:technicalScore>=85&&issues.length<=1?'PASS':technicalScore>=70?'REVIEW':'REGENERATE'};
}
export async function analyseMusicAudioBuffer(arrayBuffer){
 const Ctx=typeof AudioContext!=='undefined'?AudioContext:typeof webkitAudioContext!=='undefined'?webkitAudioContext:null;if(!Ctx)throw new Error('Web Audio API is not available in this runtime.');
 const ctx=new Ctx();try{const audio=await ctx.decodeAudioData(arrayBuffer.slice(0));return analyseMusicAudio({channels:Array.from({length:audio.numberOfChannels},(_,i)=>audio.getChannelData(i)),sampleRate:audio.sampleRate,durationSeconds:audio.duration})}finally{await ctx.close().catch(()=>{})}
}
