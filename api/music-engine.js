import { issueSignedToken, presignUrl } from '@vercel/blob';

export const maxDuration = 10;

const env = name => String(process.env[name] || '').trim();
function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const OWNER = 'bikeztagram-ai';
const REPO = 'bikeztagram-ai-build-v2';
const WORKFLOW = 'minimax-music3-kaggle.yml';
const OUTPUT_PREFIX = 'music-engine/jobs/';

function githubHeaders() {
  const token = env('GITHUB_ACTIONS_TOKEN');
  return token ? {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + token,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  } : null;
}

function cleanJobId(value) {
  const raw = String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  return raw || ('mx3-' + Date.now().toString(36));
}

function outputPath(jobId) {
  return OUTPUT_PREFIX + jobId + '.wav';
}

async function issuePut(pathname) {
  const token = await issueSignedToken({ pathname, operations: ['put'] });
  return (await presignUrl(token, {
    pathname,
    operation: 'put',
    validUntil: Date.now() + 2 * 60 * 60 * 1000,
  })).presignedUrl;
}

async function issueGet(pathname) {
  const token = await issueSignedToken({ pathname, operations: ['get'] });
  return (await presignUrl(token, {
    pathname,
    operation: 'get',
    validUntil: Date.now() + 60 * 60 * 1000,
    useCache: false,
  })).presignedUrl;
}

async function findRun(jobId) {
  try {
    const headers = githubHeaders();
    if (!headers) return null;
  const response = await fetch(
    'https://api.github.com/repos/' + OWNER + '/' + REPO +
    '/actions/workflows/' + WORKFLOW + '/runs?per_page=30&event=workflow_dispatch',
    { headers, cache: 'no-store', signal: AbortSignal.timeout(6500) }
  );
  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
    return (data.workflow_runs || []).find(run =>
      String(run.name || '').includes(jobId) ||
      String(run.display_title || '').includes(jobId)
    ) || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
  if (req.method === 'GET') {
    const jobId = cleanJobId(new URL(req.url, 'https://' + (req.headers?.host || 'localhost')).searchParams.get('jobId'));
    if (!jobId) return json(res, 400, { error: 'jobId is required.' });

    const pathname = outputPath(jobId);
    try {
      const storeId = env('PUBLIC_BLOB_STORE_ID') || env('BLOB_STORE_ID');
      if (storeId) {
        const blobUrl = 'https://' + storeId + '.public.blob.vercel-storage.com/' + pathname.split('/').map(encodeURIComponent).join('/');
        const probe = await fetch(blobUrl, { method: 'HEAD', cache: 'no-store' });
        if (probe.ok) {
          const audioUrl = await issueGet(pathname);
          return json(res, 200, {
            status: 'COMPLETED',
            audioUrl,
            mimeType: 'audio/wav',
            songId: jobId,
            duration: null,
            provider: 'Bikeztagram Music Engine · MiniMax-Music3 · Kaggle'
          });
        }
      }
    } catch {}

    const run = await findRun(jobId);
    if (run) {
      if (run.status === 'completed') {
        if (run.conclusion && run.conclusion !== 'success') {
          return json(res, 502, {
            status: 'FAILED',
            error: 'Private MiniMax Music 3 Kaggle render failed.',
            details: run.conclusion
          });
        }
        return json(res, 200, { status: 'FINALISING', progress: 95, phase: 'Finalising — uploading the finished WAV', progressEstimated: false, jobId, provider: 'Bikeztagram Music Engine · MiniMax-Music3 · Kaggle' });
      }
      const status = run.status === 'queued' || run.status === 'waiting' ? 'IN_QUEUE' : 'IN_PROGRESS';
      const phase = status === 'IN_QUEUE' ? 'Queued — waiting for a free Kaggle GPU' : 'Rendering — MiniMax Music 3 is working on the song';
      const createdAt = run.run_started_at || run.created_at;
      const elapsedSeconds = createdAt ? Math.max(0, (Date.now() - Date.parse(createdAt)) / 1000) : 0;
      // This is an intentionally conservative estimate. Kaggle startup/model loading varies,
      // so it is progress guidance rather than a claim about exact GPU inference completion.
      const estimatedPercent = status === 'IN_QUEUE' ? 5 : Math.min(90, Math.max(15, Math.round(15 + (elapsedSeconds / 480) * 75)));
      return json(res, 200, {
        status,
        progress: estimatedPercent,
        phase,
        progressEstimated: true,
        jobId,
        provider: 'Bikeztagram Music Engine · MiniMax-Music3 · Kaggle'
      });
    }

    return json(res, 200, {
      status: 'IN_QUEUE',
      jobId,
      provider: 'Bikeztagram Music Engine · MiniMax-Music3 · Kaggle'
    });
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

  const github = githubHeaders();
  if (!github) {
    return json(res, 503, {
      error: 'Zero-cost MiniMax engine is not wired to GitHub Actions yet.',
      details: 'Set the server-side GITHUB_ACTIONS_TOKEN on Vercel. This is a credential only; no paid GPU service is used.'
    });
  }

  try {
    const input = await readBody(req);
    const jobId = cleanJobId(input.jobId || ('mx3-' + Date.now().toString(36) + '-' + crypto.randomUUID().slice(0, 8)));
    const pathname = outputPath(jobId);
    const outputPutUrl = await issuePut(pathname);

    const workflowInputs = {
      job_id: jobId,
      prompt: String(input.prompt || '').slice(0, 5000),
      lyrics: String(input.lyrics || '').slice(0, 12000),
      duration: String(Math.max(5, Math.min(300, Number(input.duration) || 30))),
      bpm: String(input.bpm ?? 'auto').slice(0, 32),
      key: String(input.key ?? 'auto').slice(0, 32),
      mode: String(input.mode ?? 'auto').slice(0, 32),
      vocal_language: String(input.vocalLanguage ?? 'en').slice(0, 32),
      vocal_direction: String(input.vocalDirection || '').slice(0, 1000),
      force_instrumental: String(Boolean(input.forceInstrumental)),
      output_put_url: outputPutUrl
    };

    const response = await fetch(
      'https://api.github.com/repos/' + OWNER + '/' + REPO +
      '/actions/workflows/' + WORKFLOW + '/dispatches',
      {
        method: 'POST',
        headers: github,
        body: JSON.stringify({ ref: 'main', inputs: workflowInputs })
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return json(res, 502, {
        error: 'GitHub could not start the free Kaggle MiniMax Music 3 job.',
        details: detail.slice(0, 1200)
      });
    }

    return json(res, 202, {
      status: 'IN_QUEUE',
      jobId,
      provider: 'Bikeztagram Music Engine · MiniMax-Music3 · Kaggle'
    });
  } catch (error) {
    return json(res, 502, {
      error: 'Private MiniMax Music 3 request failed.',
      details: error?.message || String(error)
    });
  }
  } catch (error) {
    return json(res, 500, { error: 'Music engine handler error', details: error?.message || String(error), name: error?.name || 'Error' });
  }
}
