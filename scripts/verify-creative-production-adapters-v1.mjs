import { createCreativeProductionAdapters, validateCreativeProductionAdapters } from '../src/creativeProductionAdaptersV1.js';
const adapters=createCreativeProductionAdapters({services:{media:async()=>({ok:true}),director:async()=>({ok:true}),music:async()=>({ok:true}),video:async()=>({ok:true}),transitions:async()=>({ok:true}),renderer:async()=>({ok:true}),quality:async()=>({ok:true})},strict:true});
if(!adapters.available['media-intake']||!adapters.available['creative-direction']||!adapters.available['music-direction']||!adapters.available.render||!adapters.available.qa)throw new Error('Service aliases were not mapped.');
const invalid=validateCreativeProductionAdapters(adapters);if(invalid.ok)throw new Error('Missing continuity adapter should be detected.');
const allowed=validateCreativeProductionAdapters(adapters,{allowMissing:['scene-placement','continuity']});if(!allowed.ok)throw new Error('Explicitly allowed adapters should pass.');
console.log('PASS: production services map to runtime stages and missing handlers are explicit.');
