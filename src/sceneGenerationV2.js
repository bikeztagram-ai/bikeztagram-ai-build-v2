/*
 * Bikeztagram AI — in-house scene-generation planner V2.
 *
 * This is the provider-neutral layer between the Creative Director and any
 * eventual generative-video model. It can also describe procedural scenes
 * that the browser renderer can synthesize itself, so the Creative Engine is
 * useful without a paid external video provider.
 */
const text = v => String(v ?? '').trim();
const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const clamp = (v, a, b, fallback = a) => Math.max(a, Math.min(b, num(v, fallback)));

const CAMERA = {
  opening: 'slow cinematic push-in, 35mm equivalent, controlled parallax',
  reveal: 'low three-quarter tracking shot, subtle orbit, 50mm equivalent',
  action: 'dynamic tracking camera, low angle, controlled motion blur',
  bridge: 'lateral tracking shot, foreground parallax, stable horizon',
  hero: 'slow pull-back hero composition, locked horizon, premium commercial framing'
};
const LIGHT = {
  dark: 'moody directional key, cool rim light, deep controlled shadows',
  cinematic: 'soft directional key, motivated practicals, controlled highlights',
  golden: 'warm low-angle key, soft rim, long cinematic shadows',
  neon: 'cool neon practicals, cyan rim, magenta ambient bounce'
};

function inferEnvironment(prompt, media = []) {
  const p = text(prompt).toLowerCase();
  if (/city|urban|street|neon/.test(p)) return 'night urban environment with wet reflective surfaces';
  if (/mountain|alps|hill|countryside/.test(p)) return 'dramatic mountain road environment with atmospheric depth';
  if (/desert|sand|dune|mars/.test(p)) return 'open arid landscape with cinematic atmospheric haze';
  if (/space|galaxy|cosmic/.test(p)) return 'original abstract cosmic environment with stars and volumetric light';
  if (/forest|woodland/.test(p)) return 'dense forest environment with layered depth and shafts of light';
  if (media.some(m => /road|ride|bike|motor|motorcycle/i.test(`${m?.name||''} ${m?.subjectLabel||''}`))) return 'cinematic road environment inferred from uploaded motorcycle media';
  return 'cinematic environment inferred from the uploaded assets';
}

function inferLighting(prompt) {
  const p = text(prompt).toLowerCase();
  if (/neon|cyber|futur/.test(p)) return LIGHT.neon;
  if (/golden|sunset|warm/.test(p)) return LIGHT.golden;
  if (/dark|moody|noir|menacing/.test(p)) return LIGHT.dark;
  return LIGHT.cinematic;
}

function inferAction(prompt, role) {
  const p = text(prompt).toLowerCase();
  if (role === 'action') return /motorcycle|bike|car|vehicle/.test(p) ? 'accelerate through frame with purposeful forward momentum' : 'increase movement and visual intensity toward the musical peak';
  if (role === 'reveal') return 'reveal the primary subject with a clean motivated camera move';
  if (role === 'hero') return 'settle into a confident hero pose and hold the strongest composition';
  if (role === 'bridge') return 'move through the environment while preserving subject continuity';
  return 'establish atmosphere and anticipation before the reveal';
}

function sceneDuration(total, role) {
  const ratios = { opening:.12, bridge:.16, reveal:.20, action:.20, hero:.16 };
  return clamp(total*(ratios[role]||.16), .75, 4.5, 2);
}

export function buildGeneratedSceneBlueprint({ prompt = '', role = 'bridge', duration = 15, aspectRatio = '9:16', subjectIds = [], referenceAssets = [], visual = {}, continuity = {} } = {}) {
  const safeRole = ['opening','bridge','reveal','action','hero'].includes(role) ? role : 'bridge';
  const env = text(visual.environment) || inferEnvironment(prompt, referenceAssets);
  const lighting = text(visual.lighting) || inferLighting(prompt);
  const camera = text(visual.camera) || CAMERA[safeRole];
  const style = text(visual.style) || 'cinematic original film language';
  const action = inferAction(prompt, safeRole);
  const continuityAnchors = Array.isArray(continuity.anchors) ? continuity.anchors : [];
  const subjectText = subjectIds.length ? `Preserve the appearance, proportions and defining features of subject references ${subjectIds.join(', ')}.` : 'No required identity reference; create an original subject.';
  return {
    version:'generated-scene-blueprint-v2',
    id:`scene-${safeRole}-${Math.random().toString(36).slice(2,8)}`,
    role:safeRole,
    duration:clamp(duration,.5,60,sceneDuration(duration,safeRole)),
    aspectRatio:['9:16','1:1','16:9'].includes(aspectRatio)?aspectRatio:'9:16',
    prompt:text(prompt),
    direction:{style,camera,lighting,environment:env,motion:text(visual.motion)||'controlled cinematic motion',action},
    subjects:{subjectIds:[...new Set(subjectIds)],preserveIdentity:subjectIds.length>0,referenceAssets:[...new Set(referenceAssets)]},
    continuity:{anchors:continuityAnchors,matchPrevious:true,matchFollowing:true,matchColour:true},
    constraints:{originalOnly:true,noNamedStyleImitation:true,noCopyrightedCharacters:true,noLogosUnlessProvided:true,noTextArtifacts:true},
    negativePrompt:'warped geometry, duplicate subject, identity drift, extra limbs, unstable horizon, unreadable text, accidental logos, flicker, frame-to-frame texture crawl',
    render:{preferredProvider:'procedural-or-model',fallback:'browser-procedural-scene',status:'planned'}
  };
}

export function buildSceneGenerationSet({ prompt = '', duration = 15, aspectRatio = '9:16', subjectIds = [], referenceAssets = [], visual = {}, musicEvents = [] } = {}) {
  const total = clamp(duration,5,600,15);
  const roles = [
    {role:'opening', trigger:'start'},
    {role:'reveal', trigger:'primary-reveal'},
    {role:'action', trigger:'music-drop'},
    {role:'hero', trigger:'final-payoff'}
  ];
  return roles.map((item,index) => {
    const event = musicEvents.find(e => e?.type === 'drop' && index === 2);
    return buildGeneratedSceneBlueprint({
      prompt, role:item.role, duration:sceneDuration(total,item.role), aspectRatio, subjectIds, referenceAssets, visual,
      continuity:{anchors:[`film-${Math.round(total*10)}s`,`role-${item.role}`,event ? `music-${event.time}` : 'no-explicit-event']}
    });
  });
}

export function scoreGeneratedScene(scene, { prompt = '', role = '' } = {}) {
  const s = scene || {};
  const checks = {
    hasPrompt:Boolean(text(s.prompt)||text(prompt)),
    hasDirection:Boolean(s.direction?.camera && s.direction?.environment),
    hasOriginality:Boolean(s.constraints?.originalOnly),
    hasContinuity:Boolean(s.continuity?.matchPrevious && s.continuity?.matchFollowing),
    hasDuration:num(s.duration)>0,
    correctRole:!role || s.role===role
  };
  const passed=Object.values(checks).filter(Boolean).length;
  return {version:'generated-scene-score-v1',score:passed/Object.keys(checks).length,checks,ready:passed===Object.keys(checks).length};
}
