/* Universal creative brief normalization: preserve arbitrary user intent while extracting useful directing signals. */
const text = (value) => String(value ?? '').trim();
const includesAny = (source, terms) => terms.some((term) => source.includes(term));
const pick = (source, terms, fallback) => terms.find((term) => source.includes(term)) || fallback;
const inferList = (source, terms) => terms.filter((term) => source.includes(term));
const unique = (items) => [...new Set(items)];
const extract = (source, patterns) => unique(patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1]?.trim()).filter(Boolean)));
const SUBJECTS = ['motorcycle','motorbike','car','truck','vehicle','robot','person','character','animal','creature','spaceship','aircraft','building','city','landscape','product','phone','watch','helmet','shoe'];
const SETTINGS = ['space','mars','desert','jungle','forest','ocean','underwater','city','street','mountain','castle','studio','warehouse','road','beach'];
const MOODS = ['horror','dark','romantic','dreamy','epic','funny','calm','aggressive','mysterious','nostalgic','futuristic','tense','peaceful','emotional','energetic'];
const CAMERAS = ['fpv','drone','aerial','orbit','tracking','close-up','wide shot','macro','handheld','static','low angle'];
const LIGHTING = ['neon','moonlight','sunset','sunrise','golden hour','studio','volumetric','backlit','candlelight','firelight'];
const ACTIONS = ['chase','race','drift','fight','fly','explode','walk','run','transform','reveal','discover','crash','dance','build','destroy','escape','drive','ride','jump','fall','shoot','climb','swim'];
const STYLES = ['anime','western','cyberpunk','sci-fi','fantasy','documentary','commercial','music video','trailer','noir','photorealistic','surreal','stop motion','claymation','comic book','watercolor','oil painting','pixel art'];
const PACES = ['fast','slow','calm','rapid','energetic','measured','deliberate'];
const SHOT_LANGUAGE = ['establishing shot','wide shot','medium shot','close-up','extreme close-up','overhead','point of view','first person','two shot'];
export function normalizeCreativeBrief(prompt = '', options = {}) {
  const raw = text(prompt); const source = raw.toLowerCase();
  const explicitAspect = options.aspectRatio || pick(source, ['9:16','16:9','1:1','2.39:1'], 'portrait');
  const durations = extract(source, [/(?:for|lasting|duration(?: of)?)\s+(\d+(?:\.\d+)?)\s*(?:seconds|secs|s)\b/gi]);
  const dialogue = extract(raw, [/(?:dialogue|says?|saying|voiceover|vo)\s*[:\-]?\s*["“]([^"”]+)["”]/gi]);
  const namedEntities = extract(raw, [/(?:called|named|name(?:d)?|titled)\s+["“]?([A-Za-z0-9][^,.;!?"”]+?)["”]?(?=\s+(?:in|on|at|who|that|and)\b|[,.!?]|$)/gi]);
  const negatives = extract(raw, [/(?:no|without|avoid|don't|do not)\s+([^,.;!?]+)/gi]);
  return { version: 3, subject: pick(source,SUBJECTS,'subject'), setting: pick(source,SETTINGS,'environment'), mood: pick(source,MOODS,'cinematic'), camera: pick(source,CAMERAS,'cinematic'), lighting: pick(source,LIGHTING,'cinematic'), actions: unique(inferList(source,ACTIONS)), style: pick(source,STYLES,'cinematic'), pace: pick(source,PACES,'cinematic'), shotLanguage: pick(source,SHOT_LANGUAGE,'cinematic composition'), aspectRatio: explicitAspect, durationSeconds: durations[0] ? Number(durations[0]) : options.duration || null, dialogue, namedEntities, negativeRequirements: negatives, originalPrompt: raw, constraints: { originalOnly: includesAny(source,['original','no copyright','copyright-safe','copyright free']), noText: includesAny(source,['no text','without text','no captions']), noWatermark: includesAny(source,['no watermark','without watermark']) }, raw };
}
export function briefToGenerationDirectives(brief = {}) { return { subject: brief.subject || 'subject', environment: brief.setting || 'environment', mood: brief.mood || 'cinematic', camera: brief.camera || 'cinematic', lighting: brief.lighting || 'cinematic', actions: Array.isArray(brief.actions) ? brief.actions : [], style: brief.style || 'cinematic', pace: brief.pace || 'cinematic', shotLanguage: brief.shotLanguage || 'cinematic composition', aspectRatio: brief.aspectRatio || 'portrait', durationSeconds: brief.durationSeconds || null, dialogue: brief.dialogue || [], namedEntities: brief.namedEntities || [], negativeRequirements: brief.negativeRequirements || [], originalPrompt: brief.originalPrompt || brief.raw || '', constraints: { ...brief.constraints } }; }
