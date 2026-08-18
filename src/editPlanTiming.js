export function normalizeEditCut(cut = {}, moment = {}, availableMomentsLength = 0) {
  const momentIndex = Number(cut.momentIndex);
  if (!Number.isInteger(momentIndex) || momentIndex < 0 || momentIndex >= availableMomentsLength) return null;

  const momentStart = Number(moment?.start);
  const momentEnd = Number(moment?.end);
  if (!Number.isFinite(momentStart) || !Number.isFinite(momentEnd) || momentEnd <= momentStart) return null;

  const requestedStart = Number(cut.startTime);
  const startTime = Number.isFinite(requestedStart)
    ? Math.max(momentStart, Math.min(requestedStart, momentEnd))
    : momentStart;

  const requestedEnd = Number(cut.endTime);
  const sourceEnd = Number.isFinite(requestedEnd)
    ? Math.max(startTime, Math.min(requestedEnd, momentEnd))
    : momentEnd;

  const sourceSpan = sourceEnd - startTime;
  if (!Number.isFinite(sourceSpan) || sourceSpan < 0.5) return null;

  const requestedSpeed = Number(cut.speed);
  const speed = Math.max(0.5, Math.min(1.5, Number.isFinite(requestedSpeed) ? requestedSpeed : 1));
  const maxDuration = Math.min(4, sourceSpan / speed);
  if (!Number.isFinite(maxDuration) || maxDuration < 0.5) return null;

  const requestedDuration = Number(cut.duration);
  const duration = Math.max(
    0.5,
    Math.min(maxDuration, Number.isFinite(requestedDuration) ? requestedDuration : Math.min(2, maxDuration)),
  );

  const endTime = Math.min(sourceEnd, startTime + duration * speed);
  const finalDuration = (endTime - startTime) / speed;
  if (!Number.isFinite(finalDuration) || finalDuration < 0.5) return null;

  return {
    momentIndex,
    startTime,
    endTime,
    duration: finalDuration,
    purpose: String(cut.purpose || 'cinematic'),
    transition: String(cut.transition || 'hard-cut'),
    motionStyle: String(cut.motionStyle || 'static'),
    speed,
    text: String(cut.text || ''),
  };
}
