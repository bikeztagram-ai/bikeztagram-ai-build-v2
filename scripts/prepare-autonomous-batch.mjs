import fs from 'node:fs/promises';

const repo = process.env.GITHUB_REPOSITORY || 'bikeztagram-ai/bikeztagram-ai-build-v2';
const token = process.env.GITHUB_TOKEN || process.env.BUILDER_GITHUB_TOKEN;
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';
const queuePath = 'config/autonomous-builder-queue.json';

if (!token) throw new Error('A GitHub token is required to inspect autonomous-builder state.');

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

async function getBranch(branch) {
  try {
    return await api(`/repos/${owner}/${name}/git/ref/heads/${encodeURIComponent(branch)}`);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function getCommit(sha) {
  return api(`/repos/${owner}/${name}/commits/${sha}`);
}

async function deleteStaleBranch(branch) {
  await api(`/repos/${owner}/${name}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'DELETE' });
  console.log(`Deleted stale builder branch ${branch}.`);
}

for (const batch of queue.batches) {
  const branch = `autonomous-builder/${batch.id}`;
  const prs = await pullRequestsFor(branch);
  const merged = prs.find(pr => pr.merged_at);
  const open = prs.find(pr => pr.state === 'open');
  const closedUnmerged = prs.find(pr => pr.state === 'closed' && !pr.merged_at);
  const ref = await getBranch(branch);

  if (merged) {
    console.log(`${batch.id}: already merged in PR #${merged.number}; advancing queue.`);
    continue;
  }

  if (open) {
    throw new Error(`${batch.id} is already in progress in PR #${open.number}. Merge/review that batch before starting the next queued batch.`);
  }

  if (batch.status === 'rejected' || batch.status === 'skipped') {
    if (ref) await deleteStaleBranch(branch);
    console.log(`${batch.id}: marked ${batch.status}; not retrying automatically. Advancing queue.`);
    continue;
  }

  if (closedUnmerged) {
    throw new Error(`${batch.id} has a closed PR #${closedUnmerged.number} that was not merged. Review the result and explicitly mark the batch as rejected/skipped or reopen the PR before starting another batch.`);
  }

  if (ref) {
    const commit = await getCommit(ref.object.sha);
    const subject = String(commit.commit?.message || '').split('\n')[0];
    if (subject === `builder: complete ${batch.id}`) {
      throw new Error(`${batch.id} has completed builder work on ${branch} but no open PR is visible yet. Wait for the PR-preparation check to appear before starting another batch.`);
    }
    console.log(`${batch.id}: stale/partial builder branch found with no active PR; retrying from a clean branch.`);
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
