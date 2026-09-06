import { decomposeCreativePrompt, buildShotBriefs } from '../src/creativePromptDecomposer.js';
import { compileCreativeIntent } from '../src/creativeIntentCompiler.js';

const prompts=[
  `Create a 15 second film of a silver motorcycle racing through a flooded neon city at midnight, low tracking camera, rain on the lens, then reveal a glowing bridge. No text, no watermark.`,
  `Make 6 shots: an astronaut walks into an abandoned greenhouse on Mars, plants floating in zero gravity, warm sunrise through broken glass, intimate and quiet. Avoid explosions.`,
  `Design a surreal luxury watch commercial, macro details, rotating mechanism, black marble, dramatic rim light, exact words "TIME BENDS", finish with a hero product shot.`
];
for(const prompt of prompts){
  const d=decomposeCreativePrompt(prompt);
  if(!d.rawPrompt||!d.tokens.length)throw new Error('Prompt decomposition lost the original brief.');
  if(!d.clauses.length)throw new Error('Prompt decomposition produced no clauses.');
  const briefs=buildShotBriefs(prompt);
  if(!briefs.length)throw new Error('No shot briefs were produced.');
  const intent=compileCreativeIntent(prompt);
  if(intent.version!==4||intent.decomposition?.rawPrompt!==prompt)throw new Error('Creative intent does not preserve the raw prompt.');
  if(!intent.shots.length)throw new Error('Creative intent produced no shots.');
  for(const shot of intent.shots){
    if(!shot.generationPrompt.includes(prompt))throw new Error('Provider prompt lost the complete user brief.');
    if(!shot.sourceClause)throw new Error('Shot lost its user-specific clause.');
  }
}
const source=JSON.stringify({decomposeCreativePrompt,buildShotBriefs,compileCreativeIntent});
if(/gemini/i.test(source))throw new Error('Gemini reference detected.');
console.log('PASS: universal free-form prompt decomposition preserves raw briefs, constraints and shot-specific direction.');
