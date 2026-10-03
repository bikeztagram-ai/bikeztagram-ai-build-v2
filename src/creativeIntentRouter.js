/* BIKEZTAGRAM AI — top-level natural-language creative intent router. */
const text = (value) => String(value ?? '').trim();
const has = (p, terms) => terms.some((term) => p.includes(term));

export function classifyCreativeIntent(prompt = '', context = {}) {
  const raw = text(prompt);
  const p = raw.toLowerCase();
  const hasMedia = Boolean(context.hasMedia);
  const musicTerms = ['song','music','track','soundtrack','beat','instrumental','electro-house','house music','trance','techno','drum and bass','dnb','hip hop','rap','pop song','make me a tune'];
  const videoTerms = ['video','film','reel','short','advert','commercial','trailer','montage','cinematic','music video','edit'];
  const footageTerms = ['my footage','my clips','these clips','this footage','uploaded footage','bike footage','car footage','motorcycle footage','lawnmower footage','use my photos','use these photos'];
  const musicVideoTerms = ['music video','video for this song','visualizer','song with a video','track with a video','music and video','song and video'];
  const pureMusic = has(p, musicTerms) && !has(p, videoTerms) && !has(p, footageTerms);
  const musicVideo = has(p, musicVideoTerms) || (has(p, ['song','track','music']) && has(p, ['video','visuals','visual']));
  const footageEdit = hasMedia || has(p, footageTerms);
  if (musicVideo) return { type:'music-video', route:'film', label:'Music video', needsMusic:true, needsVideo:true, needsMedia:hasMedia, prompt:raw };
  if (pureMusic && !footageEdit) return { type:'music', route:'music', label:'Music', needsMusic:true, needsVideo:false, needsMedia:false, prompt:raw };
  if (footageEdit || has(p, videoTerms)) return { type:'video', route:'film', label:'Video', needsMusic:true, needsVideo:true, needsMedia:hasMedia, prompt:raw };
  return { type:'creative-film', route:'film', label:'Creative film', needsMusic:true, needsVideo:true, needsMedia:hasMedia, prompt:raw };
}

export function describeCreativeIntent(intent) {
  if (!intent) return 'Creative request';
  if (intent.type === 'music') return 'Music';
  if (intent.type === 'music-video') return 'Music video';
  if (intent.type === 'video') return intent.needsMedia ? 'Edit my media' : 'AI video';
  return 'Creative film';
}