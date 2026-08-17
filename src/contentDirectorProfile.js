/* BIKEZTAGRAM AI — subject-agnostic creative profile. */

export const CONTENT_DOMAINS = Object.freeze(['person','vehicle','travel','property','product','food','fashion','fitness','pet','gaming','music','business','event','nature','other']);

export function buildContentProfile({ domain = 'other', subject = '', story = '', mood = 'cinematic', audience = '', platform = 'reels' } = {}) {
  const safeDomain = CONTENT_DOMAINS.includes(domain) ? domain : 'other';
  return { version: 1, domain: safeDomain, subject: String(subject).trim(), story: String(story).trim(), mood: String(mood).trim() || 'cinematic', audience: String(audience).trim(), platform: String(platform).trim() || 'reels' };
}

export function validateContentProfile(profile) {
  const errors = [];
  if (!profile?.subject) errors.push('A subject or subject description is required.');
  if (!CONTENT_DOMAINS.includes(profile?.domain)) errors.push('Content domain is invalid.');
  return { valid: errors.length === 0, errors };
}
