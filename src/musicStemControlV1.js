export const MUSIC_STEMS=['vocals','drums','bass','harmony','melody','fx'];
export function createStemPlan({changes={},preserve=['vocals'],duration=0}={}){return {version:'music-stem-plan-v1',duration,preserve,changes:Object.entries(changes).map(([stem,instruction])=>({stem,instruction,enabled:MUSIC_STEMS.includes(stem)}))};}
export function validateStemPlan(plan){return {valid:Boolean(plan?.changes?.every(c=>c.enabled)),unknown:plan?.changes?.filter(c=>!c.enabled).map(c=>c.stem)||[]};}
