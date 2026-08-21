export async function executeRealMusicCommand({worker,command}={}){if(!worker?.run)throw new Error('music-worker-required');return worker.run(command);}
