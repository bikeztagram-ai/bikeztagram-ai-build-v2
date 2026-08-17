/* BIKEZTAGRAM AI — renderer golden-test matrix. */

export const GOLDEN_RENDER_CASES = [
  { id: 'motorcycle-riding-landscape', media: 'video', orientation: 'landscape', expectedMinSeconds: 5 },
  { id: 'motorcycle-riding-portrait', media: 'video', orientation: 'portrait', expectedMinSeconds: 5 },
  { id: 'motorcycle-stationary', media: 'video', orientation: 'landscape', expectedMinSeconds: 5 },
  { id: 'mixed-photo-video', media: 'mixed', orientation: 'mixed', expectedMinSeconds: 5 },
  { id: 'short-source', media: 'video', orientation: 'landscape', expectedMinSeconds: 2 },
  { id: 'low-light-riding', media: 'video', orientation: 'landscape', expectedMinSeconds: 5 },
  { id: 'multiple-motorcycles', media: 'video', orientation: 'landscape', expectedMinSeconds: 5 },
];

export function summarizeGoldenResults(results = []) {
  const total = results.length;
  const passed = results.filter((result) => result?.passed).length;
  const failed = results.filter((result) => !result?.passed).map((result) => result?.id || 'unknown');
  return {
    total,
    passed,
    failed,
    passRate: total ? Number((passed / total).toFixed(3)) : 0,
    allPassed: total > 0 && passed === total,
  };
}
