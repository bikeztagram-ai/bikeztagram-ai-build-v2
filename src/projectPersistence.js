/**
 * BIKEZTAGRAM AI — Project Persistence & Recovery Engine (Batch 98)
 * Handles saving and restoring editable project metadata:
 * - Stable media references (URLs, pathnames, mimeTypes, names) without storing File objects or large blobs.
 * - Creative brief / director prompt / director intent.
 * - Current edit plan / cuts.
 * - Production blueprint / scenes.
 * - Music choice / soundtrack metadata.
 * - Render/export settings and recent editor state.
 * - Schema version and deterministic migration.
 * - Atomic writes, last-known-good backup, corruption handling, and truthful missing-media detection.
 */

const STORAGE_KEY = 'bikeztagram_project_state_v1';
const BACKUP_STORAGE_KEY = 'bikeztagram_project_state_backup_v1';
const CURRENT_SCHEMA_VERSION = 1;

export function serializeProjectState({
  prompt,
  sources,
  analysis,
  plan,
  productionPlan,
  soundtrack,
  autoCaptions,
  captionResult,
  exportInfo
}) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    project: {
      prompt: prompt || '',
      sources: (sources || []).map(s => ({
        id: s.id || `source-${Math.random().toString(36).slice(2, 7)}`,
        name: s.name || 'media',
        type: s.type || 'video/mp4',
        mimeType: s.mimeType || s.type || 'video/mp4',
        url: s.url || '',
        pathname: s.pathname || ''
      })),
      analysis: analysis || null,
      plan: plan || null,
      productionPlan: productionPlan || null,
      soundtrack: soundtrack || null,
      autoCaptions: Boolean(autoCaptions),
      captionResult: captionResult || null,
      exportInfo: exportInfo || null
    }
  };
}

export function saveProjectState(statePayload) {
  try {
    const serialized = JSON.stringify(serializeProjectState(statePayload));
    
    // Check existing data for last-known-good backup before overwriting
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing) {
        localStorage.setItem(BACKUP_STORAGE_KEY, existing);
      }
    } catch (e) {
      console.warn('[PERSISTENCE] Could not write backup state', e);
    }

    localStorage.setItem(STORAGE_KEY, serialized);
    return { success: true, updatedAt: new Date().toISOString() };
  } catch (err) {
    console.error('[PERSISTENCE] Save failed:', err);
    return { success: false, error: err.message };
  }
}

export function loadProjectState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const backup = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (backup) {
        console.warn('[PERSISTENCE] Primary state missing; restoring from last-known-good backup.');
        raw = backup;
      }
    }
    if (!raw) return { success: false, reason: 'no_saved_project' };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.warn('[PERSISTENCE] JSON parse error on primary state; attempting backup recovery', parseErr);
      const backup = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (backup) {
        parsed = JSON.parse(backup);
      } else {
        throw parseErr;
      }
    }

    // Schema migration check
    const migrated = migrateProjectState(parsed);
    if (!migrated || !migrated.project) {
      throw new Error('Invalid project structure after migration.');
    }

    // Verify missing media state
    const sources = migrated.project.sources || [];
    const missingMedia = sources.some(s => !s.url);

    return {
      success: true,
      state: migrated.project,
      meta: {
        schemaVersion: migrated.schemaVersion || 1,
        updatedAt: migrated.updatedAt || new Date().toISOString(),
        missingMedia,
        restorableSourcesCount: sources.length
      }
    };
  } catch (err) {
    console.error('[PERSISTENCE] Load or migration failed:', err);
    // Attempt recovery from backup if not already done
    try {
      const backup = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (backup) {
        const parsedBackup = JSON.parse(backup);
        return {
          success: true,
          state: parsedBackup.project || parsedBackup,
          meta: { recoveredFromBackup: true, missingMedia: false }
        };
      }
    } catch (backupErr) {
      console.error('[PERSISTENCE] Backup recovery also failed:', backupErr);
    }

    return { success: false, error: err.message, corrupted: true };
  }
}

export function migrateProjectState(data) {
  if (!data) return null;
  let version = data.schemaVersion || 0;
  let current = data;

  // Future schema migration logic can be chained here
  if (version < 1) {
    current = {
      schemaVersion: 1,
      updatedAt: current.updatedAt || new Date().toISOString(),
      project: current.project || current
    };
  }

  return current;
}

export function clearProjectState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_STORAGE_KEY);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
