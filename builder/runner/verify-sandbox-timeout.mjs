import { Sandbox } from '@vercel/sandbox';

if (typeof Sandbox.prototype?.extendTimeout !== 'function') {
  console.error('Sandbox SDK must expose extendTimeout() for the autonomous runner.');
  process.exit(1);
}

console.log('Sandbox timeout extension API: PASS');
