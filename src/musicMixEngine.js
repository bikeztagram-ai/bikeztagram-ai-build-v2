/* Browser-local mashup engine. No upload leaves the device. */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));

export async function decodeAudioBlob(blob){
  if(!(blob instanceof Blob)) throw new Error('Audio file required.');
  const ctx=new AudioContext();
  try{return await ctx.decodeAudioData(await blob.arrayBuffer());}
  finally{await ctx.close().catch(()=>{});}
}

function wavFromBuffer(buffer){
  const channels=Math.min(2,buffer.numberOfChannels||1);
  const frames=buffer.length;
  const rate=buffer.sampleRate;
  const bytes=44+frames*channels*2;
  const out=new ArrayBuffer(bytes);
  const view=new DataView(out);
  const write=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
  write(0,'RIFF');view.setUint32(4,36+frames*channels*2,true);write(8,'WAVE');
  write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
  view.setUint16(22,channels,true);view.setUint32(24,rate,true);view.setUint32(28,rate*channels*2,true);
  view.setUint16(32,channels*2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,frames*channels*2,true);
  let p=44;
  for(let i=0;i<frames;i++)for(let ch=0;ch<channels;ch++){
    const sample=clamp(buffer.getChannelData(ch)[i],-1,1);
    view.setInt16(p,sample<0?sample*32768:sample*32767,true);p+=2;
  }
  return new Blob([out],{type:'audio/wav'});
}

export async function mergeAudioBlobs(aBlob,bBlob,{mode='layer',gainA=.8,gainB=.8,crossfade=3}={}){
  const [a,b]=await Promise.all([decodeAudioBlob(aBlob),decodeAudioBlob(bBlob)]);
  const rate=44100;
  const fade=Math.max(.1,Number(crossfade)||3);
  const duration=mode==='crossfade'
    ? Math.max(a.duration,b.duration)+fade-Math.min(a.duration,b.duration)
    : Math.max(a.duration,b.duration);
  const frames=Math.max(1,Math.ceil(duration*rate));
  const ctx=new OfflineAudioContext(2,frames,rate);
  const add=(buffer,gain,start)=>{
    const source=ctx.createBufferSource();source.buffer=buffer;
    const g=ctx.createGain();
    g.gain.setValueAtTime(Math.max(0,Number(gain)||0),Math.max(0,start));
    source.connect(g).connect(ctx.destination);
    source.start(Math.max(0,start));
  };
  if(mode==='crossfade'){
    const start=Math.max(0,a.duration-fade);
    add(a,gainA,0);
    const source=ctx.createBufferSource();source.buffer=b;
    const g=ctx.createGain();
    g.gain.setValueAtTime(0,start);
    g.gain.linearRampToValueAtTime(Math.max(0,Number(gainB)||0),start+fade);
    source.connect(g).connect(ctx.destination);source.start(start);
  }else{
    add(a,gainA,0);add(b,gainB,0);
  }
  const rendered=await ctx.startRendering();
  return {blob:wavFromBuffer(rendered),duration:rendered.duration,mimeType:'audio/wav'};
}
