const TYPES={audio:['audio/mpeg','audio/wav','audio/flac','audio/ogg'],video:['video/mp4','video/webm','video/quicktime']};
export function validateGeneratedMedia({kind,mime,sizeBytes,maxBytes=500*1024*1024}={}){const allowed=TYPES[kind]||[];return {valid:allowed.includes(mime)&&Number(sizeBytes)>0&&Number(sizeBytes)<=maxBytes,kind,mime,sizeBytes,maxBytes};}
