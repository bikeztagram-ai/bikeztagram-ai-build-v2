import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.TEST_URL;
const fixture = process.env.TEST_VIDEO || path.resolve('tests/fixtures/sample-5mb.mp4');
const analysisTimeoutMs = Number(process.env.ANALYSIS_TIMEOUT_MS || 300000);
const renderTimeoutMs = Number(process.env.RENDER_TIMEOUT_MS || 600000);
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const expectedDurationSeconds = Number(process.env.EXPECTED_RENDER_DURATION_SECONDS || 15);
const minimumDurationRatio = Number(process.env.MINIMUM_RENDER_DURATION_RATIO || 0.75);

if (!baseUrl) throw new Error('TEST_URL is required.');
if (!fs.existsSync(fixture)) throw new Error(`Test video not found: ${fixture}`);
if (!bypassSecret) throw new Error('VERCEL_AUTOMATION_BYPASS_SECRET is required for protected preview deployments.');

// Seed the Vercel automation bypass through the initial URL as well as the
// request header. This lets Vercel issue its bypass cookie before Playwright
// starts loading the app's subresources. The secret is never logged.
const testUrl = new URL(baseUrl);
testUrl.searchParams.set('x-vercel-protection-bypass', bypassSecret);
testUrl.searchParams.set('x-vercel-set-bypass-cookie', 'true');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  extraHTTPHeaders: {
    'x-vercel-protection-bypass': bypassSecret,
    'x-vercel-set-bypass-cookie': 'samesitenone',
  },
});
const page = await context.newPage();

await page.route('**/*', async (route) => {
  const headers = {
    ...route.request().headers(),
    'x-vercel-protection-bypass': bypassSecret,
    'x-vercel-set-bypass-cookie': 'samesitenone',
  };
  await route.continue({ headers });
});

const started = Date.now();
const events = [];
let fatalProviderError = null;
const isProviderFailure = (text) => /\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit|exceeded your/i.test(text);

page.on('console', (message) => {
  const text = message.text();
  events.push(`[browser:${message.type()}] ${text}`);
  if (message.type() === 'error' && isProviderFailure(text)) {
    fatalProviderError = text;
  }
});
page.on('response', (response) => {
  if (response.status() === 429) {
    fatalProviderError = `Provider returned HTTP 429 for ${response.url()}`;
  }
});
page.on('pageerror', (error) => {
  const text = error.message;
  events.push(`[pageerror] ${text}`);
  if (isProviderFailure(text)) fatalProviderError = text;
});

async function waitForBodySignal(predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fatalProviderError) {
      throw new Error(`AUTOTEST: provider error detected; aborting early: ${fatalProviderError}`);
    }
    const body = await page.locator('body').innerText().catch(() => '');
    if (predicate(body)) return body;
    if (/\bERROR\b/i.test(body)) {
      throw new Error(`AUTOTEST: application surfaced an error during ${label}: ${body.slice(-2500)}`);
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`AUTOTEST: timed out after ${Math.round(timeoutMs / 1000)}s waiting for ${label}.`);
}

try {
  console.log(`AUTOTEST: opening ${baseUrl}`);
  await page.goto(testUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log(`AUTOTEST: landed on ${new URL(page.url()).origin}`);

  if (/login|sso|vercel/i.test(await page.title())) {
    throw new Error(`Deployment is protected and the autonomous runner cannot access it. URL=${page.url()} title=${await page.title()}`);
  }

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(fixture);
  console.log('AUTOTEST: fixture supplied.');

  const analyse = page.getByRole('button', { name: /Analyse Actual Video/i });
  await analyse.click({ timeout: 15000 });
  console.log('AUTOTEST: analysis started.');

  await waitForBodySignal(
    (body) => /AI Director blueprint ready|AI Director plan ready|AI edit plan/i.test(body) && !/ERROR/i.test(body),
    analysisTimeoutMs,
    'AI analysis + Director completion',
  );
  console.log('AUTOTEST: analysis + director completed.');

  // The deployed app owns the complete render-and-QA flow behind this button.
  // Drive that real path instead of depending on an intermediate UI button.
  const fullTest = page.getByRole('button', { name: /Run Full AI Test/i });
  await fullTest.waitFor({ state: 'visible', timeout: 30000 });
  await fullTest.click();
  console.log('AUTOTEST: full render + QA started.');

  await waitForBodySignal(
    (body) => /FULL AI TEST PASSED|FULL AI TEST FAILED/i.test(body),
    renderTimeoutMs,
    'full render + QA completion',
  );

  const bodyText = await page.locator('body').innerText();
  if (/FULL AI TEST FAILED/i.test(bodyText)) {
    throw new Error(`AUTOTEST: application reported full AI test failure. ${bodyText.slice(-3000)}`);
  }
  console.log('AUTOTEST: application reported full AI test passed.');

  const videos = page.locator('video');
  const count = await videos.count();
  if (!count) throw new Error('AUTOTEST: no rendered video element found.');

  const qa = await page.evaluate(async ({ expectedDuration, minRatio }) => {
    const candidates = [...document.querySelectorAll('video')];
    const video = candidates.find((v) => v.src || v.currentSrc) || candidates[candidates.length - 1];
    if (!video) throw new Error('No video element.');
    await new Promise((resolve, reject) => {
      if (video.readyState >= 1) return resolve();
      const timer = setTimeout(() => reject(new Error('Rendered video metadata timeout.')), 15000);
      video.addEventListener('loadedmetadata', () => { clearTimeout(timer); resolve(); }, { once: true });
      video.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Rendered video decode error.')); }, { once: true });
    });
    const duration = video.duration;
    const width = video.videoWidth;
    const height = video.videoHeight;
    const start = video.currentTime;
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const end = video.currentTime;
    video.pause();
    const minimumDuration = expectedDuration * minRatio;
    const durationRatio = expectedDuration > 0 ? duration / expectedDuration : 1;
    return {
      duration,
      expectedDuration,
      minimumDuration,
      durationRatio,
      width,
      height,
      playbackAdvanced: end > start + 0.1,
      start,
      end,
      truncated: duration < minimumDuration,
    };
  }, { expectedDuration: expectedDurationSeconds, minRatio: minimumDurationRatio });

  console.log('AUTOTEST: render QA', JSON.stringify(qa));
  if (!qa.playbackAdvanced) throw new Error('AUTOTEST: rendered video did not advance during playback.');
  if (!(qa.duration > 0)) throw new Error('AUTOTEST: rendered video has no duration.');
  if (qa.truncated) {
    throw new Error(`AUTOTEST: rendered video is truncated. Expected about ${qa.expectedDuration}s; minimum accepted ${qa.minimumDuration.toFixed(2)}s; actual ${qa.duration.toFixed(2)}s.`);
  }
  if (!(qa.width > 0 && qa.height > 0)) throw new Error('AUTOTEST: rendered video has invalid dimensions.');

  console.log(`AUTOTEST PASS in ${Math.round((Date.now() - started) / 1000)}s`);
} catch (error) {
  console.error('AUTOTEST FAIL:', error?.stack || error);
  console.error(events.slice(-80).join('\n'));
  await page.screenshot({ path: 'autotest-failure.png', fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
