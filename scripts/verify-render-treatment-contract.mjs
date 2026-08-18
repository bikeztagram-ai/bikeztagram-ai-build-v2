import assert from 'node:assert/strict';

function deriveTreatment(cut, sourceDuration = 15) {
  const purpose = String(cut.purpose || '').toLowerCase();
  const duration = Number(cut.duration) || 2;
  const start = Number(cut.startTime) || 0;
  const requestedSpeedA = Math.max(0.5, Math.min(1.5, Number(cut.speed) || 1));
  const requestedSpeedB = Math.max(0.5, Math.min(1.5, Number(cut.speedEnd ?? requestedSpeedA) || requestedSpeedA));
  const purposeSpeedA = purpose.includes('action') || purpose.includes('speed') || purpose.includes('chase') ? 1.12 : purpose.includes('opening') ? .92 : purpose.includes('hero') ? .88 : 1;
  const purposeSpeedB = purpose.includes('action') || purpose.includes('speed') || purpose.includes('chase') ? 1.30 : purpose.includes('opening') ? 1.02 : purpose.includes('hero') ? .76 : requestedSpeedB;
  const maxSafeRate = Math.max(.5, Math.min(1.5, (sourceDuration - start - .05) / duration));
  return {
    speedA: Math.min(requestedSpeedA === 1 ? purposeSpeedA : requestedSpeedA, maxSafeRate),
    speedB: Math.min(requestedSpeedB === 1 ? purposeSpeedB : requestedSpeedB, maxSafeRate),
    maxSafeRate,
  };
}

const opening = deriveTreatment({ purpose: 'real-opening', startTime: 0, duration: 2.2 });
const action = deriveTreatment({ purpose: 'real-action', startTime: 4, duration: 1.8 });
const hero = deriveTreatment({ purpose: 'real-hero-ending', startTime: 10, duration: 2 });

assert.notEqual(opening.speedA, action.speedA);
assert.notEqual(action.speedB, hero.speedB);
for (const treatment of [opening, action, hero]) {
  assert.ok(treatment.speedA >= 0.5 && treatment.speedA <= 1.5);
  assert.ok(treatment.speedB >= 0.5 && treatment.speedB <= 1.5);
  assert.ok(treatment.speedA <= treatment.maxSafeRate);
  assert.ok(treatment.speedB <= treatment.maxSafeRate);
}

console.log('render-treatment-contract: PASS');
