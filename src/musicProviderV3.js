const T=Math.PI*2,hz=m=>440*2**((m-69)/12),c=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||a));
const osc=(f,t,k=0)=>k===1?(2*((t*f)%1)-1):k===2?1-4*Math.abs(Math.round((t*f)%1)-(t*f)%1):Math.sin(T*f*t);
const env=(x,d)=>x<0||x>d?0:Math.min(1,x/.008,(d-x)/Math.max(.05,Math.min(.12,d*.5)));
export function createOriginalMusicWav(seconds=15,bpm=112,{energy=.82,seed='bikeztagram-v3'}={}){
 const sr=44100,ch=2,total=c(seconds,5,3600),N=Math.floor(total*sr),data=N*4,b=new ArrayBuffer(44+data),v=new DataView(b),u=(o,x)=>v.setUint32(o,x,true),w=(o,x)=>v.setUint16(o,x,true);const s=(o,x)=>[...x].forEach((q,i)=>v.setUint8(o+i,q.charCodeAt(0)));
 s(0,'RIFF');u(4,36+data);s(8,'WAVE');s(12,'fmt ');u(16,16);w(20,1);w(22,2);u(24,sr);u(28,sr*4);w(32,4);w(34,16);s(36,'data');u(40,data);
 const beat=60/c(bpm,82,150),bar=beat*4,e=c(energy,.45,.98),root=48+(String(seed).length%3)*2,prog=[0,5,3,4],scale=[0,2,3,5,7,9,10];
 const ev=[];for(let barNo=0;barNo<Math.ceil(total/bar);barNo++){const z=barNo*bar,r=root+prog[barNo%4],section=Math.floor(barNo/8)%6,sectionGain=[.55,.72,.86,.64,.92,.48][section];for(let q=0;q<16;q++){const t=z+q*beat/4;if(t>=total)break;ev.push({t,d:beat*.22,m:r-12+(q%8===0?0:q%8===4?7:0),g:(.13+e*.06)*sectionGain,k:0});if(q%2===0)ev.push({t:t+.01,d:beat*.18,m:r+12+scale[(q/2+barNo)%7],g:(.025+e*.02)*sectionGain,k:2});if(section>=2&&q%4===0)ev.push({t:t+.005,d:.035,m:88,g:.018+e*.012,k:2});}
  for(const off of [0,beat*2])ev.push({t:z+off,d:.16,m:34,g:(.42+e*.15)*sectionGain,k:0,dr:1});for(const off of [beat,beat*3])if(barNo%2||section>=3)ev.push({t:z+off,d:.14,m:40,g:(.2+e*.08)*sectionGain,k:0,sn:1});for(const m of [r,r+scale[2],r+scale[4]])ev.push({t:z,d:Math.min(bar,total-z),m:m+12,g:(.035+e*.012)*sectionGain,k:0,pad:1});if(section===4)for(const off of [beat*.5,beat*1.5,beat*2.5,beat*3.5])ev.push({t:z+off,d:.08,m:r+24,g:.045,k:2});}
 for(let i=0;i<N;i++){const t=i/sr;let L=0,R=0;for(const q of ev){const x=t-q.t;if(x<0||x>q.d)continue;const a=env(x,q.d);let z;if(q.dr){const f=120*Math.exp(-x*24)+38;z=Math.sin(T*f*x)*Math.exp(-x*15)*q.g;}else if(q.sn){const n=Math.sin((i*12.9898+q.t*71)*78.233)*43758.5453;z=((n-Math.floor(n))*2-1)*Math.exp(-x*28)*q.g;}else if(q.pad)z=(osc(hz(q.m),x)*.65+osc(hz(q.m)*1.5,x)*.12)*a*q.g;else z=osc(hz(q.m),x,q.k||0)*a*q.g;L+=z;R+=z*(q.k===2?.92:1);}
  const fade=Math.min(1,t/.12,(total-t)/.2),m=Math.max(-.98,Math.min(.98,(L*.72)*fade));v.setInt16(44+i*4,m*32767,true);v.setInt16(46+i*4,Math.max(-.98,Math.min(.98,(R*.72)*fade))*32767,true);}
 return new Blob([b],{type:'audio/wav'});
}
export const createOriginalPulseWav=(seconds=45,bpm=112)=>createOriginalMusicWav(seconds,bpm,{energy:.82,seed:'compat'});
