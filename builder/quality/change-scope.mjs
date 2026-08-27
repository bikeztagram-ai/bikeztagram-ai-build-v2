#!/usr/bin/env node
/** Fail closed when a build unit changes files outside its declared scope. */
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).map(line => line.slice(3).trim());
const allowed = (process.env.BUILDER_ALLOWED_FILES || '').split(',').map(s => s.trim()).filter(Boolean);
const protectedPrefixes = (process.env.BUILDER_PROTECTED_PATHS || '').split(',').map(s => s.trim()).filter(Boolean);
const violations = files.filter(file => protectedPrefixes.some(prefix => file.startsWith(prefix)) || (allowed.length && !allowed.some(pattern => pattern === file || (pattern.endsWith('/*') && file.startsWith(pattern.slice(0, -1))))));
const result = { status: violations.length ? 'scope-failed' : 'scope-ok', files, allowed, violations, generatedAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
if (violations.length) process.exit(2);
