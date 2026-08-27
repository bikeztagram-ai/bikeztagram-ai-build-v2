/* BIKEZTAGRAM AI — Project Persistence & Recovery Manager */

export const SCHEMA_VERSION = 1;

/**
 * Migration function to upgrade any legacy state format to the current schema.
 * Supports explicit schema versioning and deterministic transformation.
 */
export function migrateProjectState(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('Invalid project state object');
  }

  // Deep clone state to avoid side-effects
  const migrated = JSON.parse(JSON.stringify(state));

  // If no schema version, or schema version < 1, perform migration to v1
  if (!migrated.schemaVersion || migrated.schemaVersion < 1) {
    console.log('[PERSISTENCE] Migrating project state from legacy version to v1');
    migrated.schemaVersion = SCHEMA_VERSION;

    // Validate/normalize the prompt
    if (typeof migrated.prompt !== 'string') {
      migrated.prompt = migrated.prompt || 'Create the strongest cinematic social-media film from this media. Prioritise authentic footage, clear story, rhythm, composition, premium visual direction and a strong ending.';
    }

    // Normalize sources array
    if (!Array.isArray(migrated.sources)) {
      if (Array.isArray(migrated.legacyUrls)) {
        migrated.sources = migrated.legacyUrls.map((url, index) => ({
          id: `source-${index}`,
          name: `migrated-asset-${index}`,
          type: url.includes('.mp4') || url.includes('.mov') ? 'video/mp4' : 'image/jpeg',
          url: url,
          sourceUrl: url,
          mimeType: url.includes('.mp4') || url.includes('.mov') ? 'video/mp4' : 'image/jpeg'
        }));
      } else {
        migrated.sources = [];
      }
    } else {
      migrated.sources = migrated.sources.map((src, index) => {
        if (typeof src === 'string') {
          return {
            id: `source-${index}`,
            name: `migrated-asset-${index}`,
            type: src.includes('.mp4') || src.includes('.mov') ? 'video/mp4' : 'image/jpeg',
            url: src,
            sourceUrl: src,
            mimeType: src.includes('.mp4') || src.includes('.mov') ? 'video/mp4' : 'image/jpeg'
          };
        }
        return {
          id: src.id || `source-${index}`,
          name: src.name || src.filename || `migrated-asset-${index}`,
          type: src.type || src.mimeType || 'image/jpeg',
          size: src.size || src.sizeBytes || 0,
          url: src.url || src.sourceUrl || '',
          sourceUrl: src.sourceUrl || src.url || '',
          pathname: src.pathname || '',
          mimeType: src.mimeType || src.type || 'image/jpeg'
        };
      });
    }

    // Standardize director plan structure
    if (migrated.plan && !Array.isArray(migrated.plan.cuts) && Array.isArray(migrated.plan.scenes)) {
      migrated.plan.cuts = migrated.plan.scenes;
    }
  }

  // Future schema migrations can be added here sequentially:
  // if (migrated.schemaVersion === 1) { ... migrated.schemaVersion = 2; }

  return migrated;
}

/**
 * Checks if the given state conforms strictly to the current schema.
 */
export function validateProjectState(state) {
  if (!state || typeof state !== 'object') return false;
  if (state.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof state.prompt !== 'string') return false;
  if (!Array.isArray(state.sources)) return false;

  // Verify elements of sources array
  for (const src of state.sources) {
    if (!src || typeof src !== 'object') return false;
    if (!src.id || !src.url) return false;
  }

  // Verify edit plan if present
  if (state.plan) {
    if (typeof state.plan !== 'object') return false;
    if (state.plan.cuts && !Array.isArray(state.plan.cuts)) return false;
  }

  return true;
}

/**
 * Saves the project state to localStorage.
 * Updates both the 'current' key and the verified 'last-known-good' key.
 */
export function saveProject(state) {
  try {
    const dataToSave = {
      ...state,
      schemaVersion: SCHEMA_VERSION,
      lastSaved: new Date().toISOString()
    };
    const serialized = JSON.stringify(dataToSave);
    localStorage.setItem('bikeztagram_project_current', serialized);

    // If loaded state is fully valid, write it as the last-known-good fallback
    if (validateProjectState(dataToSave)) {
      localStorage.setItem('bikeztagram_project_lkg', serialized);
    }
  } catch (err) {
    console.error('[PERSISTENCE] Failed to save project state:', err);
  }
}

/**
 * Loads project state, with robust corruption/partial-write recovery.
 * Recovers from 'current' state, falling back to 'last-known-good' if corrupted.
 */
export function loadProject() {
  let rawCurrent = null;
  try {
    rawCurrent = localStorage.getItem('bikeztagram_project_current');
  } catch (err) {
    console.error('[PERSISTENCE] Error reading current state from storage:', err);
  }

  if (rawCurrent) {
    try {
      const parsed = JSON.parse(rawCurrent);
      const migrated = migrateProjectState(parsed);
      if (validateProjectState(migrated)) {
        return { state: migrated, recoveryStatus: 'success' };
      }
      console.warn('[PERSISTENCE] Current project state is malformed or invalid.');
    } catch (err) {
      console.error('[PERSISTENCE] Failed to parse or migrate current project state:', err);
    }
  }

  // Attempt LKG recovery if current is invalid/empty
  console.log('[PERSISTENCE] Attempting recovery from last-known-good fallback...');
  let rawLkg = null;
  try {
    rawLkg = localStorage.getItem('bikeztagram_project_lkg');
  } catch (err) {
    console.error('[PERSISTENCE] Error reading last-known-good state from storage:', err);
  }

  if (rawLkg) {
    try {
      const parsed = JSON.parse(rawLkg);
      const migrated = migrateProjectState(parsed);
      if (validateProjectState(migrated)) {
        return { state: migrated, recoveryStatus: 'recovered_lkg' };
      }
    } catch (err) {
      console.error('[PERSISTENCE] Failed to parse or migrate last-known-good project state:', err);
    }
  }

  // No valid state or recovery options found
  return { state: null, recoveryStatus: rawCurrent || rawLkg ? 'corrupted' : 'none' };
}

/**
 * Verifies if the URLs of the restored media sources are still alive and accessible.
 * Returns updated source references marked with `isMissing` if they are stale or 404'ed.
 */
export async function verifyMediaSources(sources) {
  if (!Array.isArray(sources) || !sources.length) return { verified: [], missingCount: 0 };

  const verified = [];
  let missingCount = 0;

  await Promise.all(sources.map(async (src) => {
    if (!src.url) {
      verified.push({ ...src, isMissing: true });
      missingCount++;
      return;
    }
    try {
      // Use HEAD request to check availability efficiently
      const res = await fetch(src.url, { method: 'HEAD' });
      if (res.status === 404 || res.status === 410) {
        verified.push({ ...src, isMissing: true });
        missingCount++;
      } else if (res.ok) {
        verified.push({ ...src, isMissing: false });
      } else {
        // Fallback to GET check just in case HEAD is not allowed by CORS but GET is
        const getRes = await fetch(src.url, { method: 'GET' });
        if (getRes.status === 404 || getRes.status === 410) {
          verified.push({ ...src, isMissing: true });
          missingCount++;
        } else {
          verified.push({ ...src, isMissing: false });
        }
      }
    } catch (err) {
      console.warn('[PERSISTENCE] Background media check warning for url:', src.url, err);
      // On network failure or CORS blocking, keep as-is rather than flagging as missing
      verified.push({ ...src, isMissing: false });
    }
  }));

  return { verified, missingCount };
}

/**
 * Clears the persistent state.
 */
export function clearProjectPersistence() {
  try {
    localStorage.removeItem('bikeztagram_project_current');
    localStorage.removeItem('bikeztagram_project_lkg');
  } catch (err) {
    console.error('[PERSISTENCE] Failed to clear project storage:', err);
  }
}
