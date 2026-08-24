/* BIKEZTAGRAM AI — Creative Engine quality gate.
   Product-layer only. This module does not touch Blob/Gemini/render infrastructure.
   It validates the hand-off between director, soundtrack, generated scenes and renderer.
*/

const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f;};
const text=(v)=>String(v||'').trim();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const UNSAFE_STYLE_PATTERNS=[
  /in the style of\s+(disney|pixar|marvel|dc|star wars|harry potter|grand theft auto|gta|call of duty|fortnite)/i,
  /exactly like\s+(disney|pixar|marvel|dc|star wars|harry potter|grand theft auto|gta|call of duty|fortnite)/i,
  /copy\s+(the look|style|visuals)\s+of/i,
  /same character/i,
  /use the copyrighted character/i
];

export function inspectCreativePlan({plan,music=null,generatedScenes=[]}={}){
  const cuts=Array.isArray(plan?.cuts)?plan.cuts:[];
  const warnings=[];
  const errors=[];
  const checks=[];
  const add=(id,pass,message,weight=1)=>checks.push({id,pass,message,weight});

  add('plan-present',!!plan,'Director produced a usable edit plan.');
  add('minimum-cuts',cuts.length>=1,`Plan contains ${cuts.length} cut(s).`);
  const duration=cuts.reduce((s,c)=>s+num(c?.duration),0);
  const target=num(plan?.targetDuration,15);
  add('duration',duration>=Math.min(target*.65,7),`Timeline duration ${duration.toFixed(2)}s vs target ${target.toFixed(2)}s.`,2);

  const sourceIndexes=cuts.filter(c=>!c?.generated&&c?.sourceType!=='generated').map(c=>num(c?.mediaIndex,-1));
  add('source-references',sourceIndexes.every(i=>i>=0),'Uploaded cuts have valid media references.',2);

  const generated=Array.isArray(generatedScenes)?generatedScenes:cuts.filter(c=>c?.generated||c?.sourceType==='generated');
  const generatedMissingPrompt=generated.filter(s=>!text(s?.generationPrompt));
  add('generated-prompts',generatedMissingPrompt.length===0,generatedMissingPrompt.length?`${generatedMissingPrompt.length} generated scene(s) have no generation prompt.`:'Generated scenes have explicit prompts.',2);

  const promptParts=[plan?.creativePrompt, ...generated.map(s=>s?.generationPrompt)].filter(Boolean).join(' ');
  const unsafe=UNSAFE_STYLE_PATTERNS.find(rx=>rx.test(promptParts));
  if(unsafe)errors.push({code:'COPYRIGHT_STYLE_REQUEST',message:'A generated-scene prompt appears to request direct reproduction of a protected franchise/style.'});
  add('copyright-safe',!unsafe,unsafe?'Generated prompt needs an originalised treatment.':'Generated prompts pass the direct-copy safety check.',3);

  const musicAvailable=Boolean(music?.audioAvailable&&music?.audioDataUrl);
  const beatGrid=Array.isArray(music?.beatGrid)?music.beatGrid:[];
  if(music){
    add('music-audio',musicAvailable,'Soundtrack audio is available for the final render.',2);
    add('music-analysis',beatGrid.length>0||!!music?.audioAnalysis,'Soundtrack has beat/audio analysis for timing.',1);
  }

  const transitions=cuts.filter(c=>text(c?.transition)).length;
  const motion=cuts.filter(c=>text(c?.motionStyle)&&c.motionStyle!=='static').length;
  add('visual-direction',cuts.length===0?false:(motion/cuts.length)>=.5,`${motion}/${cuts.length||1} cuts contain directed motion.`);
  add('transition-language',cuts.length===0?false:(transitions/cuts.length)>=.6,`${transitions}/${cuts.length||1} cuts contain explicit transitions.`);

  const score=checks.reduce((sum,c)=>sum+(c.pass?c.weight:0),0)/Math.max(1,checks.reduce((sum,c)=>sum+c.weight,0))*100;
  const hardFailure=errors.length>0||checks.some(c=>!c.pass&&c.weight>=3);
  const verdict=hardFailure?'REVISE':score>=85?'PASS':score>=65?'PASS_WITH_WARNINGS':'REVISE';
  if(verdict==='PASS_WITH_WARNINGS')warnings.push('Creative plan is usable but should receive a quality-improvement pass before export.');
  if(score<65)warnings.push('Creative plan is below the preferred quality threshold.');
  return{verdict,score:Math.round(clamp(score,0,100)),hardFailure,checks,warnings,errors,summary:`${verdict} • ${Math.round(score)}/100 • ${errors.length} error(s) • ${warnings.length} warning(s)`};
}

export function improveCreativePlan(plan,{music=null,generatedScenes=[]}={}){
  const qa=inspectCreativePlan({plan,music,generatedScenes});
  if(qa.verdict==='PASS')return{plan,qa,changed:false};
  const next={...plan,cuts:Array.isArray(plan?.cuts)?plan.cuts.map(c=>({...c})):[]};
  next.cuts=next.cuts.map((cut,i)=>({
    ...cut,
    motionStyle:text(cut.motionStyle)|| (i%2?'pan-right':'slow-push'),
    motionIntensity:clamp(num(cut.motionIntensity,.9),.35,1.25),
    transition:text(cut.transition)|| (i===0?'fade-in':i===next.cuts.length-1?'fade-out':'hard-cut'),
    stabilization:true
  }));
  return{plan:next,qa:inspectCreativePlan({plan:next,music,generatedScenes}),changed:true};
}
