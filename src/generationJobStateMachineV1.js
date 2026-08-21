const STATES=['queued','running','completed','failed','cancelled'];
const TRANSITIONS={queued:['running','cancelled','failed'],running:['completed','failed','cancelled'],completed:[],failed:[],cancelled:[]};
export function transitionGenerationJob(job,next,patch={}){if(!STATES.includes(next))throw new Error('invalid-job-state');if(!TRANSITIONS[job?.status]?.includes(next))throw new Error(`invalid-job-transition:${job?.status}->${next}`);return {...job,...patch,status:next,updatedAt:new Date().toISOString()};}
export function isGenerationJobTerminal(job){return ['completed','failed','cancelled'].includes(job?.status);}
