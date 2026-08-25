import assert from 'node:assert/strict';
import { directCreativeRequest } from '../src/creativeDirectorV2.js';
import renderHandler from '../api/render.js';

// 1. Simulate Creative Direction
const prompt = 'Motorcycle riding on a scenic mountain road';
const assets = [{name: 'mountain1.mp4', type: 'video'}, {name: 'bike-close-up.mp4', type: 'video'}];
const direction = directCreativeRequest({prompt, assets, duration: 15});

console.log('--- Direct Creative Request ---');
assert.ok(direction.scenePlan, 'Scene plan should be generated');
assert.ok(Array.isArray(direction.scenePlan.slots), 'Scene plan should have slots');
assert.ok(direction.scenePlan.slots.length > 0, 'Scene plan should have slots');
console.log('Scene plan slots:', direction.scenePlan.slots.length);
console.log('PASS: Creative Direction');

// 2. Simulate Render
const req = {
    method: 'POST',
    body: {
        prompt,
        media: assets,
        scenePlan: direction.scenePlan
    }
};

const res = {
    status: (code) => ({
        json: (data) => {
            console.log('--- Render API Response ---');
            console.log('Success:', data.success);
            if (!data.success) console.error('Error:', data.error);
            assert.ok(data.success, 'Render API should succeed');
            assert.ok(data.plan.cuts.length > 0, 'Render API should produce cuts');
        }
    })
};

// Mock fetch
globalThis.fetch = async (url, options) => {
    const mockPlan = {
        title: "Mock Trailer",
        cuts: [
            { mediaIndex: 0, duration: 2, purpose: "hook" },
            { mediaIndex: 1, duration: 3, purpose: "reveal" }
        ]
    };
    
    return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
            candidates: [{
                content: { parts: [{ text: JSON.stringify(mockPlan) }] }
            }]
        })
    };
};

// Mock API Key
process.env.GEMINI_API_KEY = 'mock-key';

// The renderHandler is async
await renderHandler(req, res);
console.log('PASS: Render API Integration');
