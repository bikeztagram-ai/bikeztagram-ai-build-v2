/* BIKEZTAGRAM AI — deterministic audio/visual sync contract.
   Keeps the current free-first local pulse music provider intact while giving
   the director a stable beat map that visual cuts can target later. */

export function buildBeatMap({ durationSeconds = 15, bpm = 112, offsetSeconds = 0 } = {}) {
  const duration = Math.max(0.1, Number(durationSeconds) || 15);
  const tempo = Math.max(40, Math.min(220, Number(bpm) || 112));
  const beatLength = 60 / tempo;
  const beats = [];

  for (let time = Math.max(0, Number(offsetSeconds) || 0), index = 0; time < duration + 0.0001; time += beatLength, index += 1) {
    const rounded = Number(time.toFixed(4));
    beats.push({
      index,
      time: rounded,
      bar: Math.floor(index / 4),
      beatInBar: index % 4,
      accent: index % 4 === 0 ? 'downbeat' : index % 2 === 0 ? 'strong' : 'weak'
    });
  }

  return {
    bpm: tempo,
    beatLength: Number(beatLength.toFixed(4)),
    durationSeconds: duration,
    offsetSeconds: Math.max(0, Number(offsetSeconds) || 0),
    beats
  };
}

export function nearestBeat(timeSeconds, beatMap, { prefer = 'any' } = {}) {
  const beats = Array.isArray(beatMap?.beats) ? beatMap.beats : [];
  if (!beats.length) return null;
  const time = Number(timeSeconds) || 0;
  const candidates = prefer === 'downbeat' ? beats.filter((beat) => beat.accent === 'downbeat') : beats;
  const pool = candidates.length ? candidates : beats;
  return pool.reduce((best, beat) => Math.abs(beat.time - time) < Math.abs(best.time - time) ? beat : best, pool[0]);
}

export function quantizeCutTimes(cuts = [], beatMap, toleranceSeconds = 0.18) {
  return cuts.map((cut, index) => {
    const start = Number(cut?.startTime) || 0;
    const nearest = nearestBeat(start, beatMap, { prefer: index === 0 ? 'downbeat' : 'any' });
    if (!nearest || Math.abs(nearest.time - start) > toleranceSeconds) return { ...cut };
    return { ...cut, startTime: nearest.time, beatSync: { beatIndex: nearest.index, snapDistance: Number(Math.abs(nearest.time - start).toFixed(4)) } };
  });
}

export function buildVisualBeatPlan(cuts = [], beatMap) {
  return cuts.map((cut, index) => {
    const start = Number(cut?.startTime) || 0;
    const beat = nearestBeat(start, beatMap, { prefer: index === 0 ? 'downbeat' : 'any' });
    return {
      cutIndex: index,
      startTime: start,
      beatIndex: beat?.index ?? null,
      beatTime: beat?.time ?? null,
      action: index === 0 ? 'hook' : cut?.purpose?.includes('action') ? 'impact' : index === cuts.length - 1 ? 'resolve' : 'cut'
    };
  });
}
