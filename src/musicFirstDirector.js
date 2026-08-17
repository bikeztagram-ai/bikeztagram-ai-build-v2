import { buildMusicStructure } from './musicStructure.js';
import { buildEnergyPlan } from './energyDirector.js';
export function buildMusicFirstPlan(project={}, events=[]){const music=buildMusicStructure(events,project.duration||0);const energy=buildEnergyPlan(music.sections,project.style||'dynamic');return {mode:'music-first',music,energy,sourceProjectId:project.id||null};}
