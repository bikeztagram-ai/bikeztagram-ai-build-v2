/* Prevent weak source moments becoming social outputs. */
export function evaluateRepurposedClip(candidate={}) {
  const checks={hook:Number(candidate.hookScore??candidate.score??0)>=.6, visual:Number(candidate.visualScore??.6)>=.6, duration:(candidate.duration??15)>0, source:Boolean(candidate.sourceMomentId)};
  const passed=Object.values(checks).filter(Boolean).length;
  return {passed:passed>=3,checks,score:passed/Object.keys(checks).length};
}
