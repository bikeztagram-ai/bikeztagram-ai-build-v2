import { deriveCampaign } from './campaignDerivation.js';
export function buildCampaignRunPlan(project={},options={}){const requested=options.outputs||['hero','reel','teaser','square','trailer'];return deriveCampaign(project,requested).map((output,index)=>({...output,priority:index===0?'primary':'secondary',dependsOn:index===0?[]:[`${project.id||'project'}-hero`]}));}
