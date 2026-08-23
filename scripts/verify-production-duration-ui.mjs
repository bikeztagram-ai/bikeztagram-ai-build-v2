import {buildDurationUiModel,normalizeProductionDuration} from '../src/productionDurationUI.js';
const a=buildDurationUiModel(300);if(a.value!==300||!a.longForm||!a.sectionDevelopment)throw new Error('Five-minute production UI model failed.');
const b=normalizeProductionDuration('', '10 minute cinematic film');if(b.duration!==600)throw new Error('Prompt duration fallback failed.');
const c=buildDurationUiModel(30);if(!c.presets.find(p=>p.active&&p.seconds===30))throw new Error('30-second preset missing.');
console.log('PASS: production duration UI supports short and long-form jobs.');
