/* BIKEZTAGRAM AI — zero-cost local Wan 2.1 worker adapter.
 * This adapter never calls a paid provider. It shells out to a locally installed
 * Wan runtime and returns a generated MP4 path for ingestion by the job layer.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const MODEL = 'Wan-AI/Wan2.1-T2V-1.3B';
const DEFAULT_SIZE = '832*480';
const DEFAULT_SECONDS = 5;

export async function runLocalWanGeneration({ prompt, outputDir, checkpointDir, python = 'python3', timeoutMs = 20 * 60 * 1000 } = {}) {
  if (!prompt?.trim()) throw new Error('A generation prompt is required');
  if (!checkpointDir) throw new Error(`Free local generation requires ${MODEL} checkpointDir`);
  const out = path.resolve(outputDir || './generated');
  await fs.mkdir(out, { recursive: true });

  const args = [
    'generate.py', '--task', 't2v-1.3B', '--size', DEFAULT_SIZE,
    '--ckpt_dir', checkpointDir, '--sample_shift', '8', '--sample_guide_scale', '6',
    '--prompt', prompt.trim(), '--offload_model', 'True', '--t5_cpu',
    '--save_dir', out,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(python, args, { cwd: checkpointDir, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Local generation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); if (!settled) reject(err); });
    child.on('close', async (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (code !== 0) return reject(new Error(`Wan generation failed (${code}): ${stderr.slice(-3000)}`));
      const files = await fs.readdir(out);
      const videos = files.filter((f) => /\.(mp4|webm|mov)$/i.test(f)).sort();
      if (!videos.length) return reject(new Error(`Wan exited successfully but produced no video. ${stdout.slice(-1000)}`));
      resolve({ provider: 'local-wan-2.1-1.3b', model: MODEL, durationTargetSeconds: DEFAULT_SECONDS, path: path.join(out, videos.at(-1)), stdout: stdout.slice(-2000) });
    });
  });
}
