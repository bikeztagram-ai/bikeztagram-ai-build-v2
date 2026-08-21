export const UNIVERSAL_BENCHMARKS=[
 {id:'animate-object',capability:'image-to-video',assets:['object'],prompt:'Animate the supplied object naturally; preserve identity, shape and material.'},
 {id:'animate-person',capability:'image-to-video',assets:['person'],prompt:'Animate the supplied person performing a simple described action; preserve identity.'},
 {id:'multi-subject-action',capability:'subject-scene',assets:['person','object'],prompt:'Have the supplied subjects interact naturally in an original environment.'},
 {id:'new-world',capability:'text-to-video',assets:[],prompt:'Create an original cinematic world from the described environment and camera direction.'},
 {id:'story-continuity',capability:'story-sequence',assets:['reference'],prompt:'Create three connected shots preserving subjects, world and lighting continuity.'},
 {id:'real-generated-real',capability:'infill',assets:['clip-a','clip-b'],prompt:'Generate a coherent original bridge between the supplied clips.'},
 {id:'music-led-edit',capability:'text-to-music',assets:['visuals'],prompt:'Generate original music with a clear intro, build, drop and finale suitable for visual editing.'},
 {id:'freeform-idea',capability:'custom',assets:[],prompt:'Interpret an arbitrary creative idea and identify every element needed to produce it.'}
];
export function getBenchmark(id){return UNIVERSAL_BENCHMARKS.find(x=>x.id===id)||null;}
