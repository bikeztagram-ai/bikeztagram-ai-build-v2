#!/usr/bin/env node
/** Determine whether a run should stop cleanly or continue. */
const elapsed = Number(process.env.BUILDER_ELAPSED_MINUTES || 0);
const budget = Number(process.env.BUILDER_MAX_MINUTES || 360);
const completed = Number(process.env.BUILDER_COMPLETED_UNITS || 0);
const available = Number(process.env.BUILDER_TOTAL_UNITS || 0);
const reason = elapsed >= budget ? 'time-budget-reached' : completed >= available ? 'work-exhausted' : 'continue';
console.log(JSON.stringify({ status: reason === 'continue' ? 'continue' : 'stop-cleanly', reason, elapsedMinutes: elapsed, budgetMinutes: budget, completed, available, generatedAt: new Date().toISOString() }, null, 2));
