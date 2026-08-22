import {scoreCreativeOutput} from './creativeQualityScorecardV1.js';

export function evaluateCreativeQualityGate({scores={},minAccept=0.8,minRevise=0.65,minTechnical=0.7,minSubject=0.7}={}){
  const scorecard=scoreCreativeOutput({scores});
  const hardBlock=Number(scores.technicalQuality||0)<minTechnical||Number(scores.subjectConsistency||0)<minSubject;
  const decision=hardBlock?'block':scorecard.score>=minAccept?'accept':scorecard.score>=minRevise?'revise':'block';
  return {version:'creative-quality-gate-v1',decision,score:scorecard.score,hardBlock,thresholds:{minAccept,minRevise,minTechnical,minSubject},scorecard};
}
