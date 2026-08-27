export async function executeRealVideoCommand({worker,command}={}){if(!worker?.run)throw new Error('video-worker-required');return worker.run(command);}
