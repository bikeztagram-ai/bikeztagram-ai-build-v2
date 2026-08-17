export function buildBeatGrid(events = [], duration = 0) {
  return { duration, events: events.filter(e => e.time >= 0 && e.time <= duration).sort((a,b) => a.time - b.time) };
}

export function nearestBeat(time, grid = []) {
  if (!grid.length) return time;
  return grid.reduce((best, event) => Math.abs(event.time - time) < Math.abs(best - time) ? event.time : best, grid[0].time);
}
