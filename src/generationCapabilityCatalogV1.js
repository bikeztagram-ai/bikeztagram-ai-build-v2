/* Model-neutral capability catalogue used by discovery and benchmark selection. */
export const CAPABILITIES={
 music:['text-to-music','image-to-music','audio-to-music','music-extension','music-remix','stem-generation','music-event-analysis'],
 video:['text-to-video','image-to-video','multi-image-to-video','subject-scene','world-scene','character-action','object-action','infill','insert','style-transform','story-sequence'],
 audio:['speech','sound-effects','voice','audio-separation'],
 image:['text-to-image','image-edit','image-style-transform'],
 analysis:['media-understanding','subject-detection','scene-detection','audio-analysis']
};
export function listCapabilities(kind){return [...(CAPABILITIES[kind]||[])];}
export function capabilityRequirements(request={}){const requirements=[];if(request.type)requirements.push(request.type);if(request.audio?.generate)requirements.push('text-to-music');if(request.analysis)requirements.push('media-understanding');return [...new Set(requirements)];}
export function providerSatisfies(provider,requirements=[]){return requirements.every(r=>provider?.capabilities?.includes(r));}
