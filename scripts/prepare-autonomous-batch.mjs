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

function markNoWork(reason) {
  return fs.appendFile(process.env.GITHUB_ENV, `BUILDER_NO_WORK=true\nBUILDER_NO_WORK_REASON=${reason.replace(/\n/g, ' ')}\n`)
    .then(() => fs.appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `## Autonomous Builder Queue\n\n**Automatic runner idle:** ${reason}\n\nNo builder work was started. The scheduled runner will check again automatically.\n`
    ))
    .then(() => console.log(`Autonomous builder idle: ${reason}`));
}

for (const batch of queue.batches) {
  const branch = `autonomous-builder/${batch.id}`;
  const prs = await pullRequestsFor(branch);
  const merged = prs.find(pr => pr.merged_at);
  const open = prs.find(pr => pr.state === 'open');
  const closedUnmerged = prs.find(pr => pr.state === 'closed' && !pr.merged_at);
  const ref = await getBranch(branch);
  let resumeExisting = false;

  if (merged) {
    console.log(`${batch.id}: already merged in PR #${merged.number}; advancing queue.`);
    continue;
  }

  if (open) {
    await markNoWork(`${batch.id} is already in progress in PR #${open.number}; waiting for review/merge.`);
    process.exit(0);
  }

  if (batch.status === 'rejected' || batch.status === 'skipped') {
    if (ref) await deleteStaleBranch(branch);
    console.log(`${batch.id}: marked ${batch.status}; not retrying automatically. Advancing queue.`);
    continue;
  }

  if (closedUnmerged) {
    await markNoWork(`${batch.id} has closed unmerged PR #${closedUnmerged.number}; waiting for that batch to be explicitly rejected/skipped or reopened.`);
    process.exit(0);
  }

  if (ref) {
    const commit = await getCommit(ref.object.sha);
    const subject = String(commit.commit?.message || '').split('\n')[0];
    if (subject === `builder: complete ${batch.id}`) {
      console.log(`${batch.id}: builder work is already complete on ${branch}; resuming from the quality-review stage.`);
      resumeExisting = true;
    } else {
      console.log(`${batch.id}: stale/partial builder branch found with no active PR; retrying from a clean branch.`);
      await deleteStaleBranch(branch);
    }
  }

  const env = [
    `BUILDER_BATCH_ID=${batch.id}`,
    `BUILDER_WORKING_BRANCH=${branch}`,
    `BUILDER_RESUME_EXISTING=${resumeExisting ? 'true' : 'false'}`,
    `BUILDER_OBJECTIVE<<__AUTONOMOUS_BUILDER_OBJECTIVE__`,
    batch.objective,
    `__AUTONOMOUS_BUILDER_OBJECTIVE__`
  ].join('\n');
  await fs.appendFile(process.env.GITHUB_ENV, `${env}\n`);
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## Autonomous Builder Queue\n\n**Selected:** ${batch.id} — ${batch.title}\n\n**Branch:** \`${branch}\`\n\n**Mode:** ${resumeExisting ? 'Resume completed builder work for quality review.' : 'Start a new bounded builder pass.'}\n\n**Objective loaded automatically from the durable queue.**\n`);
  console.log(`Selected ${batch.id}: ${batch.title}`);
  process.exit(0);
}

await markNoWork('No queued batch is ready; the queue is waiting for the current batch to be reviewed/merged or explicitly resolved.');
process.exit(0);
