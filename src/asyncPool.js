/* Small bounded-concurrency helper for independent AI generation tasks. */
export async function mapWithConcurrency(items, limit, worker) {
  const values = Array.isArray(items) ? items : [];
  const concurrency = Math.max(1, Math.min(values.length || 1, Number(limit) || 1));
  const results = new Array(values.length);
  let cursor = 0;
  async function runner() {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      try {
        results[index] = { ok: true, value: await worker(values[index], index) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => runner()));
  return results;
}
