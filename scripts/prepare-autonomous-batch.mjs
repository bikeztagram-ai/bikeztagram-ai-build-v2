import fs from 'node:fs/promises';

const repo = process.env.GITHUB_REPOSITORY || 'bikeztagram-ai/bikeztagram-ai-build-v2';
const token = process.env.GITHUB_TOKEN || process.env.BUILDER_GITHUB_TOKEN;
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';
const queuePath = 'config/autonomous-builder-queue.json';

if (!token) throw new Error('A GitHub token is required to inspect autonomous-builder PR state.');

const queue = JSON.parse(await fs.readFile(queuePath, 'utf8'));
if (!Array.isArray(queue.batches) || !queue.batches.length) throw new Error('Autonomous builder queue is empty or invalid.');

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2026-03-10',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`GitHub API ${response.status} for ${path}: ${text}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

const [owner, name] = repo.split('/');

async function pullRequestsFor(branch) {
  return api(`/repos/${owner}/${name}/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=20`);
}

async function branchExists(branch) {
  try {
    await api(`/repos/${owner}/${name}/git/ref/heads/${encodeURIComponent(branch)}`);
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

async function deleteStaleBranch(branch) {
  await api(`/repos/${owner}/${name}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'DELETE' });
  console.log(`Deleted stale builder branch ${branch}; no open PR existed.`);
}

for (const batch of queue.batches) {
  const branch = `autonomous-builder/${batch.id}`;
  const prs = await pullRequestsFor(branch);
  const merged = prs.find(pr => pr.merged_at);
  const open = prs.find(pr => pr.state === 'open');

  if (merged) {
    console.log(`${batch.id}: already merged in PR #${merged.number}; advancing queue.`);
    continue;
  }

  if (open) {
    throw new Error(`${batch.id} is already in progress in PR #${open.number}. Merge/review that batch before starting the next queued batch.`);
  }

  if (await branchExists(branch)) {
    const closed = prs.find(pr => pr.state === 'closed' && !pr.merged_at);
    if (closed) console.log(`${batch.id}: previous PR #${closed.number} was closed without merge; retrying from a clean branch.`);
    else console.log(`${batch.id}: stale branch found with no PR; retrying from a clean branch.`);
    await deleteStaleBranch(branch);
  }

  const env = [
    `BUILDER_BATCH_ID=${batch.id}`,
    `BUILDER_WORKING_BRANCH=${branch}`,
    `BUILDER_OBJECTIVE<<__AUTONOMOUS_BUILDER_OBJECTIVE__`,
    batch.objective,
    `__AUTONOMOUS_BUILDER_OBJECTIVE__`
  ].join('\n');
  await fs.appendFile(process.env.GITHUB_ENV, `${env}\n`);
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## Autonomous Builder Queue\n\n**Selected:** ${batch.id} — ${batch.title}\n\n**Branch:** \`${branch}\`\n\n**Objective loaded automatically from the durable queue.**\n`);
  console.log(`Selected ${batch.id}: ${batch.title}`);
  process.exit(0);
}

throw new Error('No queued batch is ready. The next batch is waiting for the current batch PR to be reviewed/merged.');
