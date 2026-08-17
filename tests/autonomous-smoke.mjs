import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.TEST_URL;
const fixture = process.env.TEST_VIDEO || path.resolve('tests/fixtures/sample-5mb.mp4');
const timeoutMs = Number(process.env.TEST_TIMEOUT_MS || 900000);

if (!baseUrl) throw new Error('TEST_URL is required.');
if (!fs.existsSync(fixture)) throw new Error(`Test video not found: ${fixture}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const started = Date.now();
const events = [];

page.on('console', (message) => events.push(`[browser:${message.type()}] ${message.text()}`));
page.on('pageerror', (error) => events.push(`[pageerror] ${error.message}`));

try {
  console.log(`AUTOTEST: opening ${baseUrl}`);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log(`AUTOTEST: landed on ${page.url()}`);

  if (/login|sso|vercel/i.test(await page.title())) {
    throw new Error(`Deployment is protected and the autonomous runner cannot access it. URL=${page.url()} title=${await page.title()}`);
  }

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(fixture);
  console.log('AUTOTEST: fixture supplied.');

  const analyse = page.getByRole('button', { name: /Analyse Actual Video/i });
  await analyse.click({ timeout: 15000 });
  console.log('AUTOTEST: analysis started.');

  await page.waitForFunction(() => {
    const body = document.body.innerText;
    return /AI Director blueprint ready|AI Director plan ready|AI edit plan/i.test(body) && !/ERROR/i.test(body);
  }, null, { timeout: timeoutMs });
  console.log('AUTOTEST: analysis + director completed.');

  const build = page.getByRole('button', { name: /Build AI Edit/i });
  await build.click({ timeout: 15000 });
  console.log('AUTOTEST: render started.');

  await page.waitForFunction(() => {
    const body = document.body.innerText;
    return /AI Director edit rendered|AI edit completed|AI edit rendered/i.test(body);
  }, null, { timeout: timeoutMs });
  console.log('AUTOTEST: render completed.');

  const video = page.locator('video').filter({ has: page.locator('source') }).first();
  const videos = page.locator('video');
  const count = await videos.count();
  if (!count) throw new Error('AUTOTEST: no rendered video element found.');

  const qa = await page.evaluate(async () => {
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
    return { duration, width, height, playbackAdvanced: end > start + 0.1, start, end };
  });

  console.log('AUTOTEST: render QA', JSON.stringify(qa));
  if (!qa.playbackAdvanced) throw new Error('AUTOTEST: rendered video did not advance during playback.');
  if (!(qa.duration > 0)) throw new Error('AUTOTEST: rendered video has no duration.');
  if (!(qa.width > 0 && qa.height > 0)) throw new Error('AUTOTEST: rendered video has invalid dimensions.');

  console.log(`AUTOTEST PASS in ${Math.round((Date.now() - started) / 1000)}s`);
} catch (error) {
  console.error('AUTOTEST FAIL:', error?.stack || error);
  console.error(events.slice(-80).join('\n'));
  await page.screenshot({ path: 'autotest-failure.png', fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
