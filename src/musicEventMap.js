export function normalizeMusicEvents(events=[]){return events.filter(e=>Number.isFinite(e.time)).map(e=>({time:Math.max(0,e.time),type:e.type||'beat',strength:Math.max(0,Math.min(1,Number(e.strength??.5))),section:e.section||null})).sort((a,b)=>a.time-b.time);}
export function eventsInRange(events=[],start=0,end=Infinity){return normalizeMusicEvents(events).filter(e=>e.time>=start&&e.time<=end);}
