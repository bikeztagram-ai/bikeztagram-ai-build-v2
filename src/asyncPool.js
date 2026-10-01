/* Small bounded-concurrency helper for independent AI generation tasks. */
export async function mapWithConcurrency(items, limit, worker, onProgress) {
  const values = Array.isArray(items) ? items : [];
  const concurrency = Math.max(1, Math.min(values.length || 1, Number(limit) || 1));
  const results = new Array(values.length);
  let cursor = 0;
  let completed = 0;
  async function runner() {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      try {
        results[index] = { ok: true, value: await worker(values[index], index) };
      } catch (error) {
        results[index] = { ok: false, error };
      } finally {
        completed += 1;
        try { onProgress?.({ completed, total: values.length, index, ok: Boolean(results[index]?.ok) }); } catch {}
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => runner()));
  return results;
}
