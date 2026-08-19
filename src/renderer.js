/* BIKEZTAGRAM AI — cinematic product renderer */

export async function renderProject(mediaItems, plan, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context.');
      const stream = canvas.captureStream(30);
      const mimeTypes = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4;codecs=h264','video/mp4'];
      const selectedType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = selectedType ? new MediaRecorder(stream, { mimeType: selectedType }) : new MediaRecorder(stream);
      const chunks = []; let settled = false;
      const fail = (error) => { if (settled) return; settled = true; try { if (recorder.state !== 'inactive') recorder.stop(); } catch {} reject(error instanceof Error ? error : new Error(String(error))); };
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      recorder.onerror = (event) => fail(event.error || new Error('Video recording failed.'));
      recorder.onstop = () => { if (settled) return; settled = true; if (!chunks.length) return reject(new Error(`MediaRecorder produced no video data. Codec selected: ${selectedType || 'browser default'}.`)); resolve(new Blob(chunks, { type: chunks[0]?.type || selectedType || 'video/webm' })); };

      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      const lerp = (a, b, t) => a + (b - a) * t;
      const ease = (v) => v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
      const seed = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
      let cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
      if (!cuts.length && Array.isArray(plan?.scenes)) cuts = plan.scenes.map((scene, i) => ({ mediaIndex: scene.mediaIndex ?? 0, mediaId: scene.mediaId, startTime: Number(scene.startTime) || 0, duration: Number(scene.duration) || 2, purpose: scene.purpose || 'cinematic-scene', sourceType: scene.sourceType || 'uploaded', generated: scene.sourceType === 'generated', generationPrompt: scene.generationPrompt || '', transition: scene.transitionIn || (i ? 'crossfade' : 'fade-in'), motionStyle: scene.motionStyle || 'slow-push', motionIntensity: scene.motionIntensity || 0.9, colorGrade: scene.colorGrade || plan.colorGrade || 'cinematic' }));
      if (!cuts.length) return fail(new Error('AI edit plan contains no cuts.'));

      const findMedia = (cut) => {
        if (cut?.mediaId != null) { const found = mediaItems.find((item) => String(item.id) === String(cut.mediaId)); if (found) return found; }
        const index = Number(cut?.mediaIndex); return Number.isInteger(index) ? mediaItems[index] || null : null;
      };
      const getSourceUrl = (media) => media?.sourceUrl ? { url: media.sourceUrl, revoke: false, remote: true } : media?.file ? { url: URL.createObjectURL(media.file), revoke: true, remote: false } : null;
      const generated = (cut) => Boolean(cut?.generated || cut?.sourceType === 'generated' || cut?.sourceType === 'procedural' || cut?.generationPrompt);
      const gradeFilter = (grade) => { const g = String(grade || '').toLowerCase(); if (g.includes('natural') || g.includes('neutral')) return 'brightness(.98) contrast(1.08) saturate(1.08)'; if (g.includes('warm') || g.includes('golden')) return 'brightness(.94) contrast(1.15) saturate(1.14) sepia(.08)'; if (g.includes('blue') || g.includes('moody') || g.includes('dark')) return 'brightness(.88) contrast(1.20) saturate(1.14) hue-rotate(-6deg)'; if (g.includes('vivid') || g.includes('energetic')) return 'brightness(.95) contrast(1.20) saturate(1.28)'; return 'brightness(.90) contrast(1.18) saturate(1.12)'; };

      const drawCover = (element, t, grade) => {
        const sw = element.videoWidth || element.naturalWidth || 1080, sh = element.videoHeight || element.naturalHeight || 1920;
        if (!sw || !sh) throw new Error('Source media has no decoded dimensions.');
        const ratio = sw / sh, target = canvas.width / canvas.height;
        let width, height; if (ratio > target) { height = canvas.height * t.scale; width = height * ratio; } else { width = canvas.width * t.scale; height = width / ratio; }
        const x = (canvas.width - width) / 2 + t.x, y = (canvas.height - height) / 2 + t.y;
        ctx.save(); ctx.filter = gradeFilter(grade); if (t.r) { ctx.translate(canvas.width/2,canvas.height/2); ctx.rotate(t.r); ctx.translate(-canvas.width/2,-canvas.height/2); } ctx.drawImage(element,x,y,width,height); ctx.restore();
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
        return {scale:clamp(scale,1.01,1.24),x,y,r};
      };

      const drawWorld = (cut, progress) => {
        const p = progress, q = String(cut.generationPrompt || cut.purpose || '').toLowerCase();
        const sky = ctx.createLinearGradient(0,0,0,canvas.height); sky.addColorStop(0,'#07101b'); sky.addColorStop(.6,'#123147'); sky.addColorStop(1,'#1b1820'); ctx.fillStyle=sky; ctx.fillRect(0,0,canvas.width,canvas.height);
        const horizon = canvas.height * (.54 + Math.sin(p*Math.PI)*.015); ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle='#c98d5a';ctx.lineWidth=2;
        for(let i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(canvas.width/2+i*55,canvas.height);ctx.lineTo(canvas.width/2+i*7,horizon);ctx.stroke();} ctx.restore();
      };

      const transition = (name,p,first) => {
        const n=String(name||'hard-cut').toLowerCase(); p=clamp(p,0,1); const len=.20;
        if(first&&(n==='fade-in'||n==='fade'||n==='cinematic')){ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=1-clamp(p/len,0,1);ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
        if(n==='fade-out'){ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=clamp((p-(1-len))/len,0,1);ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
        if(n==='flash-cut'){const a=Math.max(0,1-Math.abs(p-.5)*10);ctx.save();ctx.fillStyle='#fff';ctx.globalAlpha=a*.65;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
        if(n==='dip-black'){const a=Math.max(0,1-Math.abs(p-.5)*5);ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=a*.92;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
        if(n==='crossfade'){ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=Math.max(0,1-p/.3)*.25;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
      };

      const finish = (cut,p) => {
        const prompt=String(plan?.creativePrompt||'').toLowerCase(), purpose=String(cut.purpose||'').toLowerCase();
        if(plan?.style||/cinematic|film|trailer|commercial/.test(prompt)){const v=ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*.22,canvas.width/2,canvas.height/2,canvas.height*.78);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.72,'rgba(0,0,0,.08)');v.addColorStop(1,'rgba(0,0,0,.55)');ctx.save();ctx.fillStyle=v;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
        if(/trailer|film|cinematic|commercial/.test(prompt)){const bar=Math.round(canvas.height*.035);ctx.save();ctx.fillStyle='rgba(0,0,0,.92)';ctx.fillRect(0,0,canvas.width,bar);ctx.fillRect(0,canvas.height-bar,canvas.width,bar);ctx.restore();}
      };

      const textOverlay = (cut,p) => { const text=String(cut.text||'').trim(); if(!text)return; ctx.save();ctx.font='700 58px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=12;ctx.fillText(text,canvas.width/2,canvas.height*.84);ctx.restore(); };

      recorder.start(250);
      const renderCut = async (index) => {
        if(index >= cuts.length){try{recorder.stop();}catch(e){fail(e);}return;}
        const cut=cuts[index], media=findMedia(cut), isGen=generated(cut); if(!isGen&&!media)throw new Error(`Cut ${index+1} references missing media.`);
        const source=isGen?null:getSourceUrl(media); if(!isGen&&!source)throw new Error(`Cut ${index+1} has no usable source file or Blob URL.`);
        const isVideo=!isGen&&String(media.type||'').startsWith('video'), element=isGen?null:(isVideo?document.createElement('video'):new Image()), duration=clamp(Number(cut.duration)||2,.5,8), speedStart=clamp(Number(cut.speed)||1,.5,1.75), speedEnd=clamp(Number(cut.speedEnd??cut.speed)||speedStart,.5,1.75);
        try{
          let clipStart=0;
          if(isVideo){ element.playsInline=true; element.muted=true; element.preload='auto'; try{await loadVideo(element,source);}catch(firstError){if(source.remote&&media.file){try{element.removeAttribute('src');element.load();}catch{}const fallback={url:URL.createObjectURL(media.file),revoke:true,remote:false};try{await loadVideo(element,fallback);}finally{try{URL.revokeObjectURL(fallback.url);}catch{}}}else throw firstError;} const start=Number(cut.startTime); clipStart=Number.isFinite(start)&&start>=0?Math.min(start,Math.max(0,element.duration-.05)):0; element.currentTime=clipStart; await new Promise((done)=>{let finished=false;const finishSeek=()=>{if(finished)return;finished=true;clearTimeout(timer);element.removeEventListener('seeked',finishSeek);done();};const timer=setTimeout(finishSeek,1800);element.addEventListener('seeked',finishSeek,{once:true});}); element.pause(); }
          else if(!isGen){element.src=source.url;await new Promise((done,failLoad)=>{const timer=setTimeout(()=>failLoad(new Error('Timed out loading source image.')),10000);element.onload=()=>{clearTimeout(timer);done();};element.onerror=()=>{clearTimeout(timer);failLoad(new Error('Could not load source image.'));};});}
          const started=performance.now();
          await new Promise((done)=>{const tick=()=>{const p=clamp((performance.now()-started)/(duration*1000),0,1);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);if(isGen)drawWorld(cut,p);else {if(isVideo&&Number.isFinite(element.duration)&&element.duration>0){const sourceProgress=p*duration*lerp(speedStart,speedEnd,ease(p));const targetTime=clamp(clipStart+sourceProgress,clipStart,Math.max(clipStart,element.duration-.05));try{element.currentTime=targetTime;}catch{}}drawCover(element,motion(cut,p),cut.colorGrade||plan.colorGrade);}finish(cut,p);transition(cut.transition,p,index===0);textOverlay(cut,p);onProgress?.(Math.round(((index+p)/cuts.length)*100));if(p>=1){done();return;}requestAnimationFrame(tick);};requestAnimationFrame(tick);});
          if(isVideo)element.pause();if(source?.revoke)URL.revokeObjectURL(source.url);await renderCut(index+1);
        }catch(error){if(source?.revoke){try{URL.revokeObjectURL(source.url);}catch{}}throw new Error(`Cut ${index+1} failed: ${error?.message||String(error)}`);}
      };
      const loadVideo=(video,source)=>new Promise((resolveLoad,rejectLoad)=>{const timer=setTimeout(()=>rejectLoad(new Error('Timed out loading source video.')),15000);const done=()=>{clearTimeout(timer);video.removeEventListener('loadedmetadata',done);video.removeEventListener('error',error);resolveLoad();};const error=()=>{clearTimeout(timer);video.removeEventListener('loadedmetadata',done);video.removeEventListener('error',error);rejectLoad(new Error('Could not load source video.'));};video.addEventListener('loadedmetadata',done,{once:true});video.addEventListener('error',error,{once:true});video.src=source.url;video.load();});
      renderCut(0).catch(fail);
    } catch(error) { reject(error); }
  });
}
