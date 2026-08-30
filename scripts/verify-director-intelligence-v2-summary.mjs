import { scoreMedia, classifyMediaSubject, buildShotDirection } from '../src/director.js';
const parked=scoreMedia({type:'video',name:'motorcycle parked',duration:5});
const action=scoreMedia({type:'video',name:'motorcycle accelerating cornering',duration:6,actionScore:.9,cinematicScore:.8});
if(!(action>parked))throw new Error(`director scoring regression: ${action} <= ${parked}`);
if(classifyMediaSubject({name:'scooter riding'})!=='vehicle')throw new Error('vehicle classification regression');
if(buildShotDirection({subjectType:'vehicle',role:'action'}).motion.type!=='tracking-push-pan')throw new Error('vehicle motion regression');
console.log('director intelligence summary: PASS');
