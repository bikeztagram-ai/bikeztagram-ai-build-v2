/* Provider-aware audio timing policy: generated AI audio uses only measurements from the actual audio blob. */
export function resolveAudioTiming({ provider = '', audioAnalysis = null, fallbackTimeline = [] } = {}) {
  const isAI = /eleven|ai|runway/i.test(String(provider));
  if (isAI) return { source: 'measured-audio', beatGrid: audioAnalysis?.beatGrid || [], impactMarkers: audioAnalysis?.impactMarkers || [], bpm: audioAnalysis?.estimatedBpm || null };
  return { source: 'composition-fallback', beatGrid: audioAnalysis?.beatGrid?.length ? audioAnalysis.beatGrid : fallbackTimeline.map((event) => event.time), impactMarkers: audioAnalysis?.impactMarkers?.length ? audioAnalysis.impactMarkers : [], bpm: audioAnalysis?.estimatedBpm || null };
}

export function scoreMeasuredEditSync(cuts = [], timing = {}) {
  const anchors = [...(timing.impactMarkers || []), ...(timing.beatGrid || [])].sort((a, b) => a - b);
  if (!cuts.length || !anchors.length) return 0;
  const hits = cuts.filter((cut) => { const t = Number(cut.start ?? cut.time ?? 0); return anchors.some((anchor) => Math.abs(anchor - t) <= 0.14); }).length;
  return Number((hits / cuts.length).toFixed(3));
}
