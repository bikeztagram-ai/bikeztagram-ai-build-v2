import fs from 'node:fs';
import path from 'node:path';

function isValidState(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Array.isArray(value.completed) &&
    Array.isArray(value.failed) &&
    Number.isFinite(Number(value.runs))
  );
}

function parseCandidate(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isValidState(value) ? value : null;
  } catch {
    return null;
  }
}

function promote(file, target) {
  try {
    fs.copyFileSync(file, target);
    return true;
  } catch {
    return false;
  }
}

export function loadAiderState(statePath, defaults) {
  const backupPath = `${statePath}.bak`;
  const tempPath = `${statePath}.tmp`;
  const main = parseCandidate(statePath);
  if (main) return { state: main, recovered: false, source: 'main' };

  const temp = parseCandidate(tempPath);
  if (temp) {
    promote(tempPath, statePath);
    return { state: temp, recovered: true, source: 'temp' };
  }

  const backup = parseCandidate(backupPath);
  if (backup) {
    promote(backupPath, statePath);
    return { state: backup, recovered: true, source: 'backup' };
  }

  const fresh = {
    protocol: defaults.protocol,
    completed: Array.isArray(defaults.completed) ? [...defaults.completed] : [],
    failed: Array.isArray(defaults.failed) ? [...defaults.failed] : [],
    runs: Number.isFinite(Number(defaults.runs)) ? Number(defaults.runs) : 0,
  };
  return { state: fresh, recovered: Boolean(fs.existsSync(statePath)), source: 'fresh' };
}

export function saveAiderState(statePath, state) {
  if (!isValidState(state)) throw new Error('refusing to persist invalid Aider state');
  const directory = path.dirname(statePath);
  fs.mkdirSync(directory, { recursive: true });

  const tempPath = `${statePath}.tmp`;
  const backupPath = `${statePath}.bak`;
  const payload = JSON.stringify(state, null, 2) + '\n';

  const fd = fs.openSync(tempPath, 'w');
  try {
    fs.writeFileSync(fd, payload, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  // Keep a complete, known-valid recovery copy before replacing the live state.
  // This also guarantees recovery after the very first successful save.
  try {
    fs.copyFileSync(tempPath, backupPath);
  } catch {
    // The main state can still be atomically published; an older backup may remain usable.
  }

  fs.renameSync(tempPath, statePath);
}
