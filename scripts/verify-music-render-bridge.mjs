import assert from 'node:assert/strict';
import { buildMusicRenderBridge, scoreMusicEditSync } from '../src/musicRenderBridge.js';

globalThis.fetch = async () => new Response(JSON.stringify({ error: 'not configured' }), {
  status: 503,
  headers: { 'content-type': 'application/json' },
});

globalThis.FileReader = class {
  constructor() { this.result = null; this.error = null; this.onload = null; this.onerror = null; }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;
      this.onload?.();
    }).catch((error) => { this.error = error; this.onerror?.(); });
  }
};

const bridge = await buildMusicRenderBridge({ prompt: 'dark energetic cinematic reveal', duration: 15, cuts: [{ startTime: 0, role: 'hook' }, { startTime: 3.2, role: 'action' }, { startTime: 10.1, role: 'hero' }] });
assert.equal(bridge.renderAudio.enabled, true);
assert.equal(bridge.renderAudio.originalOnly, true);
assert.ok(bridge.renderAudio.beatGrid.length > 0);
assert.ok(bridge.timeline.length === 3);
assert.ok(bridge.renderAudio.audioDataUrl.startsWith('data:audio/wav;base64,'));
assert.ok(scoreMusicEditSync(bridge) >= 0 && scoreMusicEditSync(bridge) <= 1);
console.log('music-render-bridge: PASS');
