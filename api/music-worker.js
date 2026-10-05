import { get, list, put, del } from '@vercel/blob';

export const maxDuration = 10;

const QUEUE_PREFIX = 'music-engine/queue/';
const STATUS_PREFIX = 'music-engine/status/';
const WORKER_SESSION_PATH = 'music-engine/worker/session.json';
const WORKER_HEARTBEAT_PATH = 'music-engine/worker/heartbeat.json';
const STALE_JOB_MS = 12 * 60 * 1000;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readJson(pathname) {
  try {
    const result = await get(pathname, { access: 'private' });
    if (!result?.stream) return null;
    return JSON.parse(await new Response(result.stream).text());
  } catch {
    return null;
  }
}

async function writeJson(pathname, value) {
  return put(pathname, JSON.stringify(value), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

function workerToken(req) {
  return String(req.headers?.['x-music-worker-token'] || '').trim();
}

async function authorize(req) {
  const token = workerToken(req);
  if (!token) return false;
  const session = await readJson(WORKER_SESSION_PATH);
  return Boolean(session?.token && session.token === token && Number(session.expiresAt) > Date.now());
}

async function heartbeat() {
  await writeJson(WORKER_HEARTBEAT_PATH, { updatedAt: Date.now() });
}

async function recoverStaleJob() {
  const page = await list({ prefix: STATUS_PREFIX, limit: 100 });
  for (const blob of page.blobs || []) {
    const status = await readJson(blob.pathname);
    if (status?.status !== 'IN_PROGRESS') continue;
    if (!status.updatedAt || Date.now() - status.updatedAt < STALE_JOB_MS) continue;
    if (!status.jobId || !status.outputPutUrl) continue;
    await writeJson(QUEUE_PREFIX + status.jobId + '.json', {
      ...status,
      status: 'IN_QUEUE',
      progress: 5,
      phase: 'Queued — recovering an interrupted warm-worker job',
      updatedAt: Date.now(),
    });
    await writeJson(STATUS_PREFIX + status.jobId + '.json', {
      ...status,
      status: 'IN_QUEUE',
      progress: 5,
      phase: 'Queued — recovering an interrupted warm-worker job',
      updatedAt: Date.now(),
    });
    return;
  }
}

export default async function handler(req, res) {
  try {
    if (!(await authorize(req))) return json(res, 401, { error: 'Unauthorized worker.' });

    const url = new URL(req.url, 'https://' + (req.headers?.host || 'localhost'));
    const action = url.searchParams.get('action') || 'next';

    await heartbeat();

    if (action === 'heartbeat') {
      return json(res, 200, { ok: true, heartbeatAt: Date.now() });
    }

    if (action === 'next') {
      await recoverStaleJob();
      const page = await list({ prefix: QUEUE_PREFIX, limit: 1 });
      const blob = page.blobs?.[0];
      if (!blob) return json(res, 200, { job: null, idle: true, heartbeatAt: Date.now() });

      const job = await readJson(blob.pathname);
      if (!job?.jobId) {
        await del(blob.pathname);
        return json(res, 200, { job: null, idle: true });
      }

      await del(blob.pathname);
      await writeJson(STATUS_PREFIX + job.jobId + '.json', {
        ...job,
        status: 'IN_PROGRESS',
        progress: 15,
        phase: 'Rendering — MiniMax Music 3 is working on the song',
        progressEstimated: true,
        updatedAt: Date.now(),
      });

      return json(res, 200, { job });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

    let body = {};
    try {
      body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(await new Response(req).text());
    } catch {
      body = {};
    }

    const jobId = String(body.jobId || '').trim();
    if (!jobId) return json(res, 400, { error: 'jobId is required.' });

    const current = await readJson(STATUS_PREFIX + jobId + '.json');
    const update = {
      ...(current || {}),
      ...body,
      jobId,
      updatedAt: Date.now(),
    };

    await writeJson(STATUS_PREFIX + jobId + '.json', update);
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { error: 'Music worker error', details: error?.message || String(error) });
  }
}
