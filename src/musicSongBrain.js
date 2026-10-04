/* Bikeztagram AI — Music Engine V2 Song Brain.
 * Converts a natural-language music idea into a renderer-neutral production plan.
 * This is planning intelligence, not an audio renderer.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||a));
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const GENRE_RULES=[
  ['drum and bass',/drum.?and.?bass|\\bdnb\\b|jungle/i],['hip-hop',/hip.?hop|rap|trap|808/i],
  ['rock',/rock|guitar|band|punk|grunge|metal/i],['country',/country|western|twang|honky|americana|slide guitar/i],
  ['pop',/\\bpop\\b|radio|anthem/i],['dance',/edm|house|techno|dance|electronic|trance/i],
  ['indie',/indie|alternative/i],['cinematic',/cinematic|orchestral|film|score|trailer/i]
];
const MOOD_RULES=[
  ['dark',/dark|moody|gritty|menacing|noir|night/i],['uplifting',/happy|bright|uplifting|joy|summer|feel.?good/i],
  ['emotional',/sad|emotional|melancholy|heartbreak|moving/i],['dreamy',/dreamy|ambient|ethereal|peaceful|calm/i],
  ['energetic',/energetic|driving|racing|action|powerful|aggressive/i]
];
const ENERGY_RULES=[['low',/calm|ambient|soft|gentle|intimate|slow/i],['high',/energetic|upbeat|driving|racing|aggressive|heavy|explosive|anthem/i]];
const INSTRUMENTS={
 'drum and bass':['sub bass','breakbeat drums','atmospheric pads','vocal chops','bright synth lead'],
 'hip-hop':['808 bass','tight kick','snare/clap','sampled textures','electric piano/synth'],
 rock:['live drums','electric guitar','bass guitar','rhythm guitar','lead guitar'],
 country:['live drums','bass guitar','acoustic guitar','twang electric guitar','slide guitar'],
 pop:['punchy drums','bass','synth pads','bright keys','hook lead'],
 dance:['four-on-the-floor kick','sub bass','synth bass','sidechained pads','lead synth'],
 indie:['live drums','bass guitar','electric guitar','textured keys','ambient guitar'],
 cinematic:['taiko/percussion','low strings','piano','wide pads','brass swells']
};
function pick(rules,text,fallback){return rules.find(([,rx])=>rx.test(text))?.[0]||fallback;}
export function buildSongBrain({prompt='',lyrics='',duration=30,bpm='auto',key='auto',mode='auto',vocalLanguage='en',vocalDirection='',forceInstrumental=false}={}){
 const p=clean(prompt),genre=pick(GENRE_RULES,p,'cinematic'),mood=pick(MOOD_RULES,p,'cinematic');
 const energy=pick(ENERGY_RULES,p,'medium'),seconds=clamp(duration,5,300),tempo=bpm==='auto'?'adaptive':clamp(bpm,55,190);
 const sections=seconds<25?['intro','hook','development','outro']:seconds<50?['intro','verse','chorus','outro']:seconds<90?['intro','verse','pre-chorus','chorus','verse','outro']:['intro','verse','pre-chorus','chorus','verse','bridge','final chorus','outro'];
 const instruments=[...(INSTRUMENTS[genre]||INSTRUMENTS.cinematic)];
 const arc=seconds<50?['establish motif','introduce groove','lift the hook','resolve cleanly']:['establish motif','add rhythmic foundation','open the harmony','lift the chorus','strip back for contrast','final lift','resolve cleanly'];
 const lyricBrief=forceInstrumental?'No sung lyrics. Keep any vocal texture non-lexical and subordinate to the instrumental.':['Write original lyrics directly about the user\'s requested subject.','Use concrete nouns, actions and details from the brief rather than generic filler.','Give the chorus a short memorable hook that can repeat naturally.','Use section tags on their own lines.',vocalDirection?'Vocal character: '+clean(vocalDirection)+'.':'','Language: '+(vocalLanguage||'en')+'.'].filter(Boolean).join(' ');
 return {version:'song-brain-v2',prompt:p,genre,mood,energy,duration:seconds,bpm:tempo,key,mode,vocalLanguage,forceInstrumental:Boolean(forceInstrumental),sections,arrangementArc:arc,instrumentPalette:instruments,lyricBrief,suppliedLyrics:Boolean(clean(lyrics)),productionNotes:[
  'Create an original '+genre+' production with '+mood+' emotional colour.',
  'Use clear section contrast: '+sections.join(' → ')+'.',
  'Arrangement arc: '+arc.join(' → ')+'.',
  'Core palette: '+instruments.join(', ')+'.',
  tempo==='adaptive'?'Choose tempo to support the brief.':'Target approximately '+tempo+' BPM.',
  key!=='auto'?'Centre the harmony around '+key+'.':'',mode!=='auto'?'Use '+mode+' modal/harmonic colour.':'',
  'Prioritise a strong recurring motif, audible low-end foundation, controlled dynamics and a deliberate ending.',
  'Do not imitate a named artist, existing recording or copyrighted song.'
 ].filter(Boolean).join(' ')};
}
export function songBrainToInstruction(brain={}){
 return ['BIKEZTAGRAM SONG BRAIN V2.',brain.productionNotes||'','LYRIC BRIEF: '+(brain.lyricBrief||'Write original lyrics that directly follow the user brief.'),'STRUCTURE: '+(brain.sections||[]).join(' → ')+'.','ARRANGEMENT ARC: '+(brain.arrangementArc||[]).join(' → ')+'.','INSTRUMENT PALETTE: '+(brain.instrumentPalette||[]).join(', ')+'.'].filter(Boolean).join(' ');
}
