/* Maps musical events to editorial actions without touching the protected renderer. */

const ACTIONS={
  intro:'establish',build:'increase-motion',riser:'anticipate',drop:'reveal-or-impact',
  fill:'transition',break:'hold-or-breathe',finale:'hero-payoff',energy:'vary-pacing'
};

export function buildMusicVideoDirectives(audioMap,{maxDirectives=16}={}){
 const events=Array.isArray(audioMap?.events)?audioMap.events:[];
 return events.slice(0,maxDirectives).map((event,index)=>({
   id:`music-directive-${index+1}`,
   time:Number(event.time)||0,
   kind:event.kind||event.type||'energy',
   action:ACTIONS[event.kind]||ACTIONS[event.type]||'vary-pacing',
   strength:Number(event.strength)||0,
   visual:{preferCut:true,preferMotion:event.type!=='break',preferGeneratedScene:['drop','finale'].includes(event.kind)},
   source:'creative-audio-map-v2'
 }));
}

export function applyMusicDirectivesToTimeline(shots=[],directives=[]){
 return (Array.isArray(shots)?shots:[]).map(shot=>{
   const nearest=(Array.isArray(directives)?directives:[]).reduce((best,d)=>Math.abs(d.time-(shot.start||0))<Math.abs(best.time-(shot.start||0))?d:best,directives[0]);
   if(!nearest)return shot;
   return {...shot,musicDirectiveId:nearest.id,musicAction:nearest.action,musicEventTime:nearest.time};
 });
}
