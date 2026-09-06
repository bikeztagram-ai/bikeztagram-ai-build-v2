/* Universal free-form prompt decomposition. This is deliberately provider-neutral: it preserves the user's exact brief while extracting portable constraints and shot cues. */
const text=(v)=>String(v??'').trim();
const unique=(xs)=>[...new Set(xs.filter(Boolean))];
const words=(value)=>text(value).toLowerCase().split(/[^a-z0-9'’-]+/).filter(Boolean);
const clean=(value)=>text(value).replace(/^[-–—•\s]+|[-–—•\s]+$/g,'').trim();

function clauses(prompt){
  return text(prompt).split(/(?:\n+|[.!?;]+|\s+then\s+|\s+while\s+|\s+as\s+|\s+before\s+|\s+after\s+)/i).map(clean).filter((x)=>x.length>=3);
}
function matches(prompt,pattern){return unique([...text(prompt).matchAll(pattern)].map((m)=>clean(m[1]||m[0])));}

export function decomposeCreativePrompt(prompt=''){
  const raw=text(prompt);
  const tokens=words(raw);
  const sections=clauses(raw);
  const quoted=matches(raw,/['“”"]([^'“”"]{2,100})['“”"]/g);
  const negatives=unique([
    ...matches(raw,/(?:no|without|avoid|never|don't|do not)\s+([^,.;\n]+)/gi),
    ...matches(raw,/(?:exclude|excluding)\s+([^,.;\n]+)/gi),
  ]);
  const requirements=unique([
    ...matches(raw,/(?:must|need to|needs to|required to|ensure)\s+([^,.;\n]+)/gi),
    ...matches(raw,/(?:include|including)\s+([^,.;\n]+)/gi),
  ]);
  const cameraCues=unique(tokens.filter((t)=>['close-up','closeup','macro','wide','aerial','overhead','drone','fpv','handheld','tracking','orbit','dolly','push-in','pull-back','pan','tilt','static','locked','whip','crane','zoom'].includes(t)));
  const motionCues=unique(tokens.filter((t)=>['accelerate','accelerating','drift','drifting','race','racing','chase','chasing','explode','explosion','crash','crashing','fly','flying','soar','dive','fall','rise','walk','run','jump','fight','attack','escape','transform','morph','spin','rotate','collide','splash','smash','reveal','emerge','approach','depart'].includes(t)));
  const visualCues=unique(tokens.filter((t)=>['neon','cinematic','photorealistic','stylized','surreal','dreamlike','gritty','minimalist','luxury','retro','futuristic','vintage','dark','moody','bright','epic','intimate','comedic','horror','beautiful','dramatic','volumetric','foggy','rainy','snowy','sunset','sunrise','night','day'].includes(t)));
  const shotCountMatch=raw.match(/(?:\b|^)(\d{1,2})\s+(?:shots?|scenes?|cuts?)(?:\b|$)/i);
  const durationMatches=[...raw.matchAll(/(\d+(?:\.\d+)?)\s*(?:second|seconds|sec|s)\b/gi)].map((m)=>Number(m[1])).filter(Number.isFinite);
  const outputHints=unique([
    ...matches(raw,/(?:for|to)\s+(instagram|tiktok|youtube|shorts|reels?|story|portrait|landscape|square|cinema|commercial|trailer)/gi),
    ...tokens.filter((t)=>['instagram','tiktok','youtube','shorts','reels','story','portrait','landscape','square','cinema','commercial','trailer'].includes(t)),
  ]);
  return {
    version:1,
    rawPrompt:raw,
    tokens:unique(tokens).slice(0,240),
    clauses:sections.slice(0,32),
    quotedText:quoted,
    negativeConstraints:negatives.slice(0,32),
    positiveRequirements:requirements.slice(0,32),
    cameraCues:cameraCues.slice(0,24),
    motionCues:motionCues.slice(0,32),
    visualCues:visualCues.slice(0,40),
    requestedShotCount:shotCountMatch?Math.max(1,Math.min(24,Number(shotCountMatch[1]))):null,
    requestedDurations:durationMatches.slice(0,24),
    outputHints,
    freeForm:true,
  };
}

export function buildShotBriefs(prompt='',shotCount=0){
  const d=decomposeCreativePrompt(prompt);
  const count=Math.max(1,Math.min(24,Number(shotCount)||d.requestedShotCount||Math.min(12,Math.max(3,d.clauses.length))));
  const source=d.clauses.length?d.clauses:[d.rawPrompt];
  return Array.from({length:count},(_,index)=>({
    index,
    sourceClause:source[index%source.length],
    rawPrompt:d.rawPrompt,
    requirements:d.positiveRequirements,
    avoid:d.negativeConstraints,
    cameraCues:d.cameraCues,
    motionCues:d.motionCues,
    visualCues:d.visualCues,
    quotedText:d.quotedText,
  }));
}
