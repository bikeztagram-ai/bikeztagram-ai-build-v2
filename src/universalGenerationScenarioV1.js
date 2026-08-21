/* Broad scenarios ensure benchmark coverage is not accidentally motorcycle-specific. */
export const SCENARIOS=[
 {id:'subject-animation',type:'image-to-video',brief:'Animate a supplied subject naturally while preserving identity.'},
 {id:'multi-subject',type:'subject-scene',brief:'Two supplied subjects interact naturally in an original environment.'},
 {id:'world-generation',type:'world-scene',brief:'Create an original world from text with coherent camera movement.'},
 {id:'action',type:'character-action',brief:'Perform a clearly described multi-step action.'},
 {id:'story-sequence',type:'story-sequence',brief:'Create multiple connected scenes with continuity.'},
 {id:'real-generated-bridge',type:'infill',brief:'Bridge two supplied clips with a generated story beat.'},
 {id:'music-generation',type:'music-video',brief:'Generate original music and align meaningful visual events to it.'},
 {id:'prompt-fidelity',type:'custom',brief:'Follow a detailed creative brief without losing required constraints.'}
];
export function getUniversalScenario(id){return SCENARIOS.find(s=>s.id===id)||null;}
