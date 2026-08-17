/* Sound design plan: ambience, impacts, dialogue, music and intentional silence. */
const LAYERS = Object.freeze(['dialogue','music','ambience','foley','impacts']);
export function buildSoundDesign({ mood='cinematic', intensity=0.5, dialogue=false }={}) {
  const i=Math.max(0,Math.min(1,Number(intensity)||0.5));
  return { version:1, mood, layers:LAYERS.map(type=>({type, enabled:type!=='dialogue'||dialogue, intensity:type==='impacts'?i:Math.max(.2,i*.8)})), ducking:dialogue?'dialogue-priority':'balanced', silenceMoments:i>.7?['hook','payoff']:['payoff'] };
}
