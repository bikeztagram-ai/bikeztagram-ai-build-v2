import {renderMusicWav,createMusicPreview,analyseMusic} from './musicStudioEngine.js';
export {renderMusicWav,createMusicPreview};
export function analyseMusicComposition(composition){const x=analyseMusic(composition);return{...x,melodyNotes:x.melodyEvents||0,bassNotes:x.bassEvents||0,drumHits:x.drumEvents||0}}
