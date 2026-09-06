import fixWebmDuration from 'fix-webm-duration';
export async function repairRecordedVideoBlob(blob,durationMs){if(!(blob instanceof Blob)||!blob.size)return blob;const type=String(blob.type||'').toLowerCase();if(!type.includes('webm'))return blob;const ms=Number(durationMs);if(!Number.isFinite(ms)||ms<=0)return blob;try{return await fixWebmDuration(blob,ms,{logger:false})}catch{return blob}}
