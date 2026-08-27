#!/usr/bin/env node
/** Classify failures into safe retry, repair-required, or hard-stop outcomes. */
const category = process.env.BUILDER_FAILURE_CATEGORY || 'UNKNOWN';
const attempt = Number(process.env.BUILDER_REPAIR_ATTEMPT || '0');
const maxRepairAttempts = Number(process.env.BUILDER_MAX_REPAIR_ATTEMPTS || '2');
const retryable = new Set(['TIMEOUT', 'DEPENDENCY_FAILURE', 'ENVIRONMENT_FAILURE']);
const repairable = new Set(['BUILD_FAILURE', 'TEST_FAILURE', 'INTEGRATION_FAILURE', 'ACCEPTANCE_FAILURE', 'REGRESSION', 'SCOPE_FAILURE']);
let action = 'hard-stop';
if (retryable.has(category) && attempt < 1) action = 'retry';
else if (repairable.has(category) && attempt < maxRepairAttempts) action = 'repair-and-reverify';
const result = { category, attempt, maxRepairAttempts, action, generatedAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
if (action === 'hard-stop') process.exit(2);
