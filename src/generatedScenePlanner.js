/* BIKEZTAGRAM AI — generated-scene planning contract.
 * Pure, deterministic planning layer kept separate from renderer/provider code.
 */
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const hash=(value)=>{let h=2166136261;for(const c of String(value||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const pick=(items,seed)=>items[hash(seed)%items.length];

export function createGeneratedScenePlan({prompt='',analysis={},duration=15,missingShots=3}={}){
  const total=clamp(Number(duration)||15,5,180);
  const count=clamp(Math.round(Number(missingShots)||3),1,12);
  const p=String(prompt||'').trim();
  const subject=analysis?.subject||analysis?.mainSubject||'the main subject';
  const environments=['moody road at blue hour','rain-soaked urban street','open coastal road at dusk','cinematic mountain pass','original futuristic roadway'];
  const cameras=['low tracking shot','slow push-in','side pursuit shot','wide establishing shot','hero orbit'];
  const lighting=['cool rim light','soft dusk backlight','wet reflective highlights','dramatic directional light','subtle atmospheric glow'];
  const purposes=['hook','build','reveal','escalation','hero','outro'];
  return Array.from({length:count},(_,i)=>{
    const purpose=purposes[Math.min(i,purposes.length-1)];
    const seed=`${p}|${subject}|${i}|${purpose}`;
    return {
      id:`generated-scene-${i+1}`,
      sourceType:'generated',
      duration:Number((total/count).toFixed(3)),
      purpose,
      generationPrompt:[
        `Create an original cinematic shot of ${subject}.`,
        `Shot purpose: ${purpose}.`,
        `Environment: ${pick(environments,seed+'env')}.`,
        `Camera: ${pick(cameras,seed+'cam')}.`,
        `Lighting: ${pick(lighting,seed+'light')}.`,
        'Maintain visual continuity with neighbouring shots.',
        'Do not imitate or reproduce a named copyrighted character, franchise, film, game, artist, or exact visual work.',
        p?`Creative direction: ${p}`:''
      ].filter(Boolean).join(' '),
      camera:pick(cameras,seed+'camera'),
      environment:pick(environments,seed+'environment'),
      lighting:pick(lighting,seed+'lighting'),
      continuityKey:hash(`${subject}|${p}|${i}`)
    };
  });
}

export function validateGeneratedScenePlan(scenes=[]){
  const errors=[];
  if(!Array.isArray(scenes)||!scenes.length)errors.push('No generated scenes were planned.');
  scenes.forEach((scene,i)=>{
    if(!scene?.generationPrompt)errors.push(`Scene ${i+1} has no generation prompt.`);
    if(!Number.isFinite(Number(scene?.duration))||Number(scene.duration)<=0)errors.push(`Scene ${i+1} has invalid duration.`);
    if(scene?.sourceType!=='generated')errors.push(`Scene ${i+1} is not marked generated.`);
  });
  return {valid:errors.length===0,errors};
}
