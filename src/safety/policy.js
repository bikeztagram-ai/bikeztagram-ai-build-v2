const BLOCK_PATTERNS = [
  { code: 'MINOR_SEXUAL', pattern: /\b(child|children|kid|minor|underage|teen|teenager)\b.{0,80}\b(nude|naked|sexual|sex|porn|erotic|explicit)\b/i },
  { code: 'NONCONSENSUAL_INTIMATE', pattern: /\b(deepfake|fake)\b.{0,100}\b(nude|naked|sexual|porn|intimate)\b/i },
  { code: 'SEXUAL_EXPLOITATION', pattern: /\b(sexual|porn|explicit|nude|naked)\b.{0,100}\b(without consent|non[- ]consensual|revenge|leak|leaked|blackmail)\b/i },
  { code: 'CREDIBLE_VIOLENCE_REQUEST', pattern: /\bhow to\b.{0,80}\b(kill|murder|poison|assassinate|make a bomb|build a bomb)\b/i },
  { code: 'FRAUD_OR_IMPERSONATION', pattern: /\b(create|make|generate)\b.{0,100}\b(fake (id|passport|document|invoice)|impersonat(e|ion)|scam|phish|fraud)\b/i },
  { code: 'MALWARE_OR_CYBER_ABUSE', pattern: /\b(create|write|deploy|generate)\b.{0,100}\b(ransomware|malware|keylogger|credential stealer|botnet|phishing kit)\b/i },
];

const TRANSFORM_PATTERNS = [
  { code: 'PROTECTED_CHARACTER_OR_ASSET', pattern: /\b(exactly|identical|copy|recreate|reproduce)\b.{0,100}\b(character|scene|map|logo|asset|footage)\b/i },
  { code: 'LIVING_PERSON_STYLE', pattern: /\bin the exact style of\b.{0,80}\b(director|artist|photographer|actor|creator)\b/i },
  { code: 'REAL_PERSON_DECEPTION', pattern: /\b(make|generate|edit)\b.{0,100}\b(real person|celebrity|politician)\b.{0,80}\b(say|endorse|admit|confess)\b/i },
];

function normalise(input) {
  return String(input ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/**
 * Classify a creative request before it reaches a generation provider.
 * Keyword matches are signals only; callers must also apply contextual,
 * rights, consent and output checks.
 */
export function classifyCreativeRequest(input, context = {}) {
  const text = normalise(input);
  if (!text) return { decision: 'ALLOW', code: 'EMPTY_REQUEST', matched: [] };

  const blocked = BLOCK_PATTERNS.filter((rule) => rule.pattern.test(text));
  if (blocked.length) {
    return {
      decision: 'BLOCK',
      code: blocked[0].code,
      matched: blocked.map((rule) => rule.code),
      reason: 'Request contains a high-risk prohibited pattern.',
    };
  }

  const transform = TRANSFORM_PATTERNS.filter((rule) => rule.pattern.test(text));
  if (transform.length) {
    return {
      decision: 'TRANSFORM',
      code: transform[0].code,
      matched: transform.map((rule) => rule.code),
      reason: 'Preserve the legitimate creative goal while removing protected expression or deceptive use.',
      safeBriefRequired: true,
    };
  }

  if (context?.consent === false || context?.rights === false) {
    return {
      decision: 'BLOCK',
      code: 'MISSING_CONSENT_OR_RIGHTS',
      matched: [],
      reason: 'Required consent or usage rights were explicitly denied.',
    };
  }

  return { decision: 'ALLOW', code: 'NO_HIGH_RISK_SIGNAL', matched: [] };
}

export function buildSafeBrief(input, classification) {
  if (classification?.decision !== 'TRANSFORM') return normalise(input);
  return [
    'Create an original work that preserves the user’s high-level intent, mood, genre, pacing and cinematography.',
    'Do not reproduce protected characters, logos, maps, footage, exact scenes, distinctive assets, or another creator’s exact style.',
    `Original request: ${normalise(input)}`,
  ].join(' ');
}

export const SAFETY_POLICY_VERSION = '1.0.0';
