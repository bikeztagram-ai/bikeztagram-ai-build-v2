// Layered prompt-safety gate for user-directed creative generation.
// This is a product safety filter, not a legal guarantee. Server-side/provider
// policy checks must remain authoritative for generated content.

const RULES = [
  { id: 'sexual-minor', severity: 'block', patterns: [/underage.{0,24}(sex|sexual|nude|naked|porn)/i, /minor.{0,24}(sex|sexual|nude|naked|porn)/i, /child.{0,24}(sex|sexual|nude|naked|porn)/i, /teen.{0,24}(sex|sexual|nude|naked|porn)/i] },
  { id: 'sexual-explicit', severity: 'block', patterns: [/\b(porn|pornography|xxx|explicit sex|sexual intercourse)\b/i] },
  { id: 'graphic-sexual-violence', severity: 'block', patterns: [/sexual.{0,20}(assault|violence|abuse|rape)/i, /rape.{0,20}(scene|video|image|fantasy)/i] },
  { id: 'extreme-graphic-violence', severity: 'block', patterns: [/\b(gore|gory|dismember|decapitat|eviscerat|torture)\w*/i] },
  { id: 'terrorist-promotion', severity: 'block', patterns: [/\b(join|recruit|recruitment|propaganda|praise|glorify)\b.{0,50}\b(isis|isil|al[- ]?qaeda|daesh)\b/i, /\b(isis|isil|al[- ]?qaeda|daesh)\b.{0,50}\b(join|recruit|propaganda|praise|glorify)\b/i] },
  { id: 'criminal-instruction', severity: 'review', patterns: [/how to.{0,35}(make|build|synthesize).{0,35}(bomb|explosive|weapon|poison)/i, /how to.{0,35}(hack|steal|fraud|scam|launder)/i] },
  { id: 'weapon-construction', severity: 'review', patterns: [/how to.{0,35}(build|make|assemble).{0,35}(gun|firearm|explosive|bomb|silencer)/i] },
  { id: 'targeted-harassment', severity: 'review', patterns: [/\b(dox|doxx|swat)\b/i, /publish.{0,20}(address|phone|private).{0,20}(someone|person|target)/i] },
];

const ALLOWED_CONTEXT = [
  { id: 'fictional-action', patterns: [/fictional|story|movie|film|game|trailer|cinematic|screenplay/i] },
  { id: 'news-documentary', patterns: [/documentary|news|historical|educational|report/i] },
];

function normalize(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function inspectCreativePrompt(prompt = '') {
  const text = normalize(prompt);
  const matches = [];
  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) matches.push({ id: rule.id, severity: rule.severity });
  }
  const blocked = matches.filter((m) => m.severity === 'block');
  const review = matches.filter((m) => m.severity === 'review');
  return {
    allowed: blocked.length === 0 && review.length === 0,
    requiresReview: blocked.length === 0 && review.length > 0,
    decision: blocked.length ? 'block' : review.length ? 'review' : 'allow',
    matches,
    normalizedPrompt: text,
    hasCreativeContext: ALLOWED_CONTEXT.some(({ patterns }) => patterns.some((pattern) => pattern.test(text))),
  };
}

export function safeCreativePrompt(prompt = '') {
  const result = inspectCreativePrompt(prompt);
  if (result.decision === 'block') {
    return { ...result, prompt: '', userMessage: 'This request cannot be generated because it conflicts with the app\'s content-safety rules.' };
  }
  if (result.decision === 'review') {
    return { ...result, prompt: '', userMessage: 'This request needs a safety review before generation.' };
  }
  return { ...result, prompt: result.normalizedPrompt, userMessage: '' };
}

export function describeSafetyDecision(result) {
  if (!result || result.decision === 'allow') return 'Safety check passed.';
  if (result.decision === 'review') return 'Safety review required before generation.';
  return 'Generation blocked by content-safety rules.';
}
