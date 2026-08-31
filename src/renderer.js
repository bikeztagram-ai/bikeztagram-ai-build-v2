/* BIKEZTAGRAM AI — cinematic product renderer */

import { attachPlanAudioToRenderStream } from './renderAudioBridge.js';

export async function renderProject(mediaItems, plan, onProgress) {
  return new Promise((resolve, reject) => {
    let recorder = null;
    let audioBridge = null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context.');
      const stream = canvas.captureStream(30);
      const mimeTypes = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4;codecs=h264','video/mp4'];
      const selectedType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const chunks = []; let settled = false;
      const fail = (error) => { if (settled) return; settled = true; try { if (recorder?.state !== 'inactive') recorder?.stop(); } catch {} try { audioBridge?.cleanup?.(); } catch {} reject(error instanceof Error ? error : new Error(String(error))); };

      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      const lerp = (a, b, t) => a + (b - a) * t;
      const ease = (v) => v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
      const seed = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
      let cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
      if (!cuts.length && Array.isArray(plan?.scenes)) cuts = plan.scenes.map((scene, i) => ({ mediaIndex: scene.mediaIndex ?? 0, mediaId: scene.mediaId, startTime: Number(scene.startTime) || 0, duration: Number(scene.duration) || 2, purpose: scene.purpose || 'cinematic-scene', sourceType: scene.sourceType || 'uploaded', generated: scene.sourceType === 'generated', generationPrompt: scene.generationPrompt || '', transition: scene.transitionIn || (i ? 'crossfade' : 'fade-in'), motionStyle: scene.motionStyle || 'slow-push', motionIntensity: scene.motionIntensity || 0.9, colorGrade: scene.colorGrade || plan.colorGrade || 'cinematic', focalFraming: scene.focalFraming || null }));
      if (!cuts.length) return fail(new Error('AI edit plan contains no cuts.'));

      const findMedia = (cut) => {
        if (cut?.mediaId != null) { const found = mediaItems.find((item) => String(item.id) === String(cut.mediaId)); if (found) return found; }
        const index = Number(cut?.mediaIndex); return Number.isInteger(index) ? mediaItems[index] || null : null;
      };
      const getSourceUrl = (media) => media?.sourceUrl ? { url: media.sourceUrl, revoke: false, remote: true } : media?.file ? { url: URL.createObjectURL(media.file), revoke: true, remote: false } : null;
      const generated = (cut) => Boolean(cut?.generated || cut?.sourceType === 'generated' || cut?.sourceType === 'procedural' || cut?.generationPrompt);
      const gradeFilter = (grade) => { const g = String(grade || '').toLowerCase(); if (g.includes('natural') || g.includes('neutral')) return 'brightness(.98) contrast(1.08) saturate(1.08)'; if (g.includes('warm') || g.includes('golden')) return 'brightness(.94) contrast(1.15) saturate(1.14) sepia(.08)'; if (g.includes('blue') || g.includes('moody') || g.includes('dark')) return 'brightness(.88) contrast(1.20) saturate(1.14) hue-rotate(-6deg)'; if (g.includes('vivid') || g.includes('energetic')) return 'brightness(.95) contrast(1.20) saturate(1.28)'; return 'brightness(.90) contrast(1.18) saturate(1.12)'; };

      const drawCover = (element, t, grade, focalFraming) => {
        const sw = element.videoWidth || element.naturalWidth || 1080, sh = element.videoHeight || element.naturalHeight || 1920;
        if (!sw || !sh) throw new Error('Source media has no decoded dimensions.');
        const ratio = sw / sh, target = canvas.width / canvas.height;
        let width, height; if (ratio > target) { height = canvas.height * t.scale; width = height * ratio; } else { width = canvas.width * t.scale; height = width / ratio; }
        const focalX = clamp(Number(focalFraming?.x) || .5,.12,.88), focalY = clamp(Number(focalFraming?.y) || .5,.12,.88);
        const focalScale = clamp(Number(focalFraming?.scale) || 1, .96, 1.12);
        width *= focalScale; height *= focalScale;
        const x = (canvas.width - width) / 2 + t.x + (0.5 - focalX) * width;
        const y = (canvas.height - height) / 2 + t.y + (0.5 - focalY) * height;
        ctx.save(); ctx.filter = gradeFilter(grade); if (t.r) { ctx.translate(canvas.width/2,canvas.height/2); ctx.rotate(t.r); ctx.translate(-canvas.width/2,-canvas.height/2); } ctx.drawImage(element,x,y,width,height); ctx.restore();
      };

      const drawWorld = (cut, progress) => {
        const p = progress, q = String(cut.generationPrompt || cut.purpose || '').toLowerCase();
        const neon = /neon|cyber|future|futuristic|city|night/.test(q), desert = /desert|mars|sand|dust/.test(q), space = /space|galaxy|cosmic|star/.test(q), dark = /horror|dark|eerie|creepy|noir/.test(q);
        const sky = ctx.createLinearGradient(0,0,0,canvas.height);
        if (space) { sky.addColorStop(0,'#03030a'); sky.addColorStop(.6,'#0b1020'); sky.addColorStop(1,'#16101b'); }
        else if (desert) { sky.addColorStop(0,'#24100a'); sky.addColorStop(.55,'#6b3020'); sky.addColorStop(1,'#b95d32'); }
        else if (neon) { sky.addColorStop(0,'#02050b'); sky.addColorStop(.58,'#071d2d'); sky.addColorStop(1,'#160b24'); }
        else if (dark) { sky.addColorStop(0,'#010203'); sky.addColorStop(.65,'#0b1115'); sky.addColorStop(1,'#050506'); }
        else { sky.addColorStop(0,'#07101b'); sky.addColorStop(.6,'#123147'); sky.addColorStop(1,'#1b1820'); }
        ctx.fillStyle=sky; ctx.fillRect(0,0,canvas.width,canvas.height);
        const horizon = canvas.height * (.54 + Math.sin(p*Math.PI)*.015), glow = ctx.createRadialGradient(canvas.width/2,horizon,10,canvas.width/2,horizon,canvas.width*.72);
        glow.addColorStop(0,neon?'rgba(55,190,255,.42)':'rgba(255,180,100,.18)'); glow.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=glow; ctx.fillRect(0,0,canvas.width,canvas.height);
        if (space) for (let i=0;i<90;i++) { ctx.fillStyle=`rgba(255,255,255,${.2+seed(i+160)*.7})`; ctx.fillRect(seed(i)*canvas.width,seed(i+80)*canvas.height*.72,1.5+seed(i+300)*2,1.5+seed(i+301)*2); }
        if (neon || (!desert && !space)) for (let i=0;i<14;i++) { const bw=55+seed(i+10)*100,bh=100+seed(i+30)*360,x=i*(canvas.width/14)-10,y=horizon-bh; ctx.fillStyle='rgba(3,9,16,.96)'; ctx.fillRect(x,y,bw,bh); for(let w=0;w<3;w++) for(let h=0;h<7;h++) if(seed(i*40+w*9+h)>.48){ctx.fillStyle=neon?'rgba(45,210,255,.55)':'rgba(255,205,130,.22)';ctx.fillRect(x+12+w*20,y+22+h*36,7,12);} }
        ctx.save(); ctx.globalAlpha=neon?.36:.18; ctx.strokeStyle=neon?'#43d9ff':'#c98d5a'; ctx.lineWidth=2;
        for(let i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(canvas.width/2+i*55,canvas.height);ctx.lineTo(canvas.width/2+i*7,horizon);ctx.stroke();}
        for(let i=1;i<9;i++){const t=i/9,y=horizon+Math.pow(t,1.8)*(canvas.height-horizon);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();} ctx.restore();
        if(/action|chase|pursuit|race|speed|impact/.test(q)){ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle='#fff';for(let i=0;i<16;i++){const y=horizon+seed(i+400)*canvas.height*.45,x=seed(i+500)*canvas.width,len=80+seed(i+600)*220;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-len*(.35+p*.25),y);ctx.stroke();}ctx.restore();}
      };

      const motion = (cut,p) => {
        const m=String(cut.motionStyle||'static').toLowerCase(), e=ease(p), intensity=clamp(Number(cut.motionIntensity)||1,.35,1.6); let scale=cut.stabilization?1.065:1.025,x=0,y=0,r=0;
        if(m.includes('slow-push')||m.includes('push')||m==='zoom') scale+=e*.115*intensity;
        else if(m.includes('slow-pull')||m.includes('pull')||m.includes('zoom-out')) scale+=(1-e)*.115*intensity;
        else if(m.includes('pan-right')){scale=Math.max(scale,1.08);x=(e-.5)*canvas.width*.15*intensity;}
        else if(m.includes('pan-left')){scale=Math.max(scale,1.08);x=(.5-e)*canvas.width*.15*intensity;}
        else if(m.includes('tilt-up')){scale=Math.max(scale,1.08);y=(.5-e)*canvas.height*.09*intensity;}
        else if(m.includes('tilt-down')){scale=Math.max(scale,1.08);y=(e-.5)*canvas.height*.09*intensity;}
        else if(m.includes('orbit')||m.includes('parallax')){scale=Math.max(scale,1.09);x=Math.sin(e*Math.PI*2)*canvas.width*.035*intensity;y=Math.cos(e*Math.PI*2)*canvas.height*.018*intensity;r=Math.sin(e*Math.PI*2)*.006*intensity;}
        const purpose=String(cut.purpose||'').toLowerCase(), action=/action|chase|impact|energetic|race|speed/.test(purpose+' '+String(plan?.creativePrompt||''));
        if(action && cut.stabilization===false){x+=Math.sin(p*Math.PI*34)*.7*intensity;y+=Math.cos(p*Math.PI*29)*.5*intensity;r+=Math.sin(p*Math.PI*20)*.001*intensity;}
        return {scale:clamp(scale,1.01,1.28),x,y,r};
      };

      const transition = (name,p,first) => {
        const n=String(name||'hard-cut').toLowerCase(); p=clamp(p,0,1); const len=.20;
        if(first&&(n==='fade-in'||n==='fade'||n==='cinematic')){ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=1-clamp(p/len,0,1);ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
        if(n==='fade-out'){ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=clamp((p-(1-len))/len,0,1);ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
        if(n==='flash-cut'){const a=Math.max(0,1-Math.abs(p-.5)*10);ctx.save();ctx.fillStyle='#fff';ctx.globalAlpha=a*.65;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
        if(n==='dip-black'){const a=Math.max(0,1-Math.abs(p-.5)*5);ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=a*.92;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
        if(n==='crossfade'){ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=Math.max(0,1-p/.3)*.25;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
        if(n==='whip-left'||n==='whip-right'){const dir=n==='whip-left'?-1:1,edge=p<.5?p*2:(1-p)*2,w=canvas.width*(.08+edge*.66);ctx.save();ctx.fillStyle='#02060b';ctx.globalAlpha=.82;ctx.fillRect(dir<0?canvas.width-w:0,0,w,canvas.height);ctx.restore();}
        if(n==='zoom-punch'){const a=Math.sin(Math.min(1,p*2)*Math.PI);ctx.save();ctx.strokeStyle='#fff';ctx.globalAlpha=a*.22;ctx.lineWidth=14;ctx.strokeRect(12+a*40,12+a*40,canvas.width-24-a*80,canvas.height-24-a*80);ctx.restore();}
        if(n.includes('light-leak')){const x=n.includes('left')?-canvas.width*.15+p*canvas.width*.75:n.includes('right')?canvas.width*1.15-p*canvas.width*.75:canvas.width*p,leak=ctx.createRadialGradient(x,canvas.height*.45,0,x,canvas.height*.45,canvas.width*.55);leak.addColorStop(0,'rgba(255,220,150,.32)');leak.addColorStop(.35,'rgba(255,140,60,.10)');leak.addColorStop(1,'rgba(255,80,30,0)');ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=leak;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
      };

      const finish = (cut,p) => {
        const prompt=String(plan?.creativePrompt||'').toLowerCase(), purpose=String(cut.purpose||'').toLowerCase();
        if(plan?.style||/cinematic|film|trailer|commercial/.test(prompt)){
          const v=ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*.22,canvas.width/2,canvas.height/2,canvas.height*.78);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.72,'rgba(0,0,0,.08)');v.addColorStop(1,'rgba(0,0,0,.55)');ctx.save();ctx.fillStyle=v;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
          ctx.save();ctx.globalAlpha=.045;for(let i=0;i<70;i++){ctx.fillStyle=seed(i+Math.floor(p*7))>.5?'#fff':'#000';ctx.fillRect(seed(i*3)*canvas.width,seed(i*7)*canvas.height,1+seed(i+500)*2,1+seed(i+500)*2);}ctx.restore();
        }
        if(/action|chase|speed|impact|race|energetic/.test(purpose+' '+prompt)){ctx.save();ctx.globalAlpha=.10;ctx.strokeStyle='#fff';for(let i=0;i<7;i++){const y=(.18+seed(i+900)*.64)*canvas.height,x=seed(i+1000)*canvas.width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+90+seed(i+1100)*220,y);ctx.stroke();}ctx.restore();}
        if(/trailer|film|cinematic|commercial/.test(prompt)){const bar=Math.round(canvas.height*.035);ctx.save();ctx.fillStyle='rgba(0,0,0,.92)';ctx.fillRect(0,0,canvas.width,bar);ctx.fillRect(0,canvas.height-bar,canvas.width,bar);ctx.restore();}
      };

      const textOverlay = (cut,p) => {
        const text=String(cut.text||'').trim(); if(!text)return; const tin=clamp(Number(cut.textIn)||.10,0,.75),tout=clamp(Number(cut.textOut)||.86,tin+.05,1); const a=clamp(p<tin?p/tin:p>tout?1-(p-tout)/Math.max(.05,1-tout):1,0,1), intro=1-Math.pow(1-clamp(p/Math.max(.01,tin),0,1),3);
        ctx.save();ctx.globalAlpha=a;ctx.translate(canvas.width/2,canvas.height-230+(1-intro)*24);ctx.scale(.94+intro*.06,.94+intro*.06);ctx.fillStyle='#fff';ctx.font='800 54px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowBlur=20;ctx.fillText(text.toUpperCase(),0,0);ctx.restore();
      };

      const loadVideo = async (element,source) => {
        element.muted=true;element.playsInline=true;element.preload='auto';element.crossOrigin=source.remote?'anonymous':'';element.src=source.url;
        await new Promise((resolve,rejectLoad)=>{let done=false;const timeout=setTimeout(()=>finish(new Error('Timed out loading source video.')),12000);const cleanup=()=>{clearTimeout(timeout);element.removeEventListener('loadedmetadata',onMeta);element.removeEventListener('loadeddata',onData);element.removeEventListener('canplay',onCanPlay);element.removeEventListener('error',onError);};const finish=(error)=>{if(done)return;done=true;cleanup();error?rejectLoad(error):resolve();};const onMeta=()=>{if(element.videoWidth&&element.videoHeight)finish();};const onData=()=>{if(element.videoWidth&&element.videoHeight)finish();};const onCanPlay=()=>{if(element.videoWidth&&element.videoHeight)finish();};const onError=()=>{const e=element.error;finish(new Error(`Could not decode source video. MediaError code=${e?.code??'unknown'}; ${e?.message||'browser media decoder rejected the source'}; readyState=${element.readyState}; networkState=${element.networkState}; canPlayType=${element.canPlayType('video/mp4')||'no'}.`));};element.addEventListener('loadedmetadata',onMeta);element.addEventListener('loadeddata',onData);element.addEventListener('canplay',onCanPlay);element.addEventListener('error',onError);element.load();});
        if(!element.videoWidth||!element.videoHeight||!Number.isFinite(element.duration))throw new Error(`Source video decoded incorrectly: ${element.videoWidth}x${element.videoHeight}, duration=${element.duration}.`);
      };

      const begin = async () => {
        audioBridge = await attachPlanAudioToRenderStream(stream, plan);
        recorder = selectedType ? new MediaRecorder(stream, { mimeType: selectedType }) : new MediaRecorder(stream);
        recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
        recorder.onerror = (event) => fail(event.error || new Error('Video recording failed.'));
        recorder.onstop = () => { if (settled) return; settled = true; try { audioBridge?.cleanup?.(); } catch {} if (!chunks.length) return reject(new Error(`MediaRecorder produced no video data. Codec selected: ${selectedType || 'browser default'}.`)); resolve(new Blob(chunks, { type: chunks[0]?.type || selectedType || 'video/webm' })); };
        recorder.start(1000);
        const renderCut = async (index) => {
          if(index>=cuts.length){if(recorder.state!=='inactive')recorder.stop();return;}
          const cut=cuts[index]||{}, isGen=generated(cut), media=isGen?null:findMedia(cut); if(!isGen&&!media)throw new Error(`Cut ${index+1} references missing media.`);
          const isVideo=!isGen&&String(media.type||'').startsWith('video'), source=isGen?null:getSourceUrl(media); if(!isGen&&!source)throw new Error(`Cut ${index+1} has no usable source file or Blob URL.`);
          const element=isGen?null:(isVideo?document.createElement('video'):new Image()), duration=clamp(Number(cut.duration)||2,.5,8), speedStart=clamp(Number(cut.speed)||1,.5,1.75), speedEnd=clamp(Number(cut.speedEnd??cut.speed)||speedStart,.5,1.75);
          try{
            if(isVideo){try{await loadVideo(element,source);}catch(firstError){if(source.remote&&media.file){console.warn('[Bikeztagram] Public Blob source failed; retrying local File source.',firstError);try{element.removeAttribute('src');element.load();}catch{}const fallback={url:URL.createObjectURL(media.file),revoke:true,remote:false};try{await loadVideo(element,fallback);}finally{try{URL.revokeObjectURL(fallback.url);}catch{}}}else throw firstError;}
              const start=Number(cut.startTime);if(Number.isFinite(start)&&start>=0){element.currentTime=Math.min(start,Math.max(0,element.duration-.05));await new Promise((done)=>{let finished=false;const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);element.removeEventListener('seeked',finish);done();};const timer=setTimeout(finish,1800);element.addEventListener('seeked',finish,{once:true});});}element.playbackRate=speedStart;await element.play();
            }else if(!isGen){element.src=source.url;await new Promise((done,failLoad)=>{const timer=setTimeout(()=>failLoad(new Error('Timed out loading source image.')),10000);element.onload=()=>{clearTimeout(timer);done();};element.onerror=()=>{clearTimeout(timer);failLoad(new Error('Could not load source image.'));};});}
            const started=performance.now();
            await new Promise((done)=>{const tick=()=>{const p=clamp((performance.now()-started)/(duration*1000),0,1);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);if(isGen)drawWorld(cut,p);else drawCover(element,motion(cut,p),cut.colorGrade||plan.colorGrade,cut.focalFraming);if(isVideo&&element.readyState>=2){try{element.playbackRate=lerp(speedStart,speedEnd,ease(p));}catch{}}finish(cut,p);transition(cut.transition,p,index===0);textOverlay(cut,p);onProgress?.(Math.round(((index+p)/cuts.length)*100));if(p>=1){done();return;}requestAnimationFrame(tick);};requestAnimationFrame(tick);});
            if(isVideo)element.pause();if(source?.revoke)URL.revokeObjectURL(source.url);await renderCut(index+1);
          }catch(error){if(source?.revoke){try{URL.revokeObjectURL(source.url);}catch{}}throw new Error(`Cut ${index+1} failed: ${error?.message||String(error)}`);}
        };
        renderCut(0).catch(fail);
      };
      begin().catch(fail);
    }catch(error){reject(error);}
  });
}
