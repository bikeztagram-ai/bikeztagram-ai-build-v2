const text=v=>String(v??'').trim();
export function buildGeneratedSceneContinuity({subjectIds=[],previousShot=null,nextShot=null,sceneBlueprint=null}={}){
 const subjects=Array.isArray(subjectIds)?subjectIds.filter(Boolean):[];
 return {version:'generated-scene-continuity-v1',subjects,previousShotId:text(previousShot?.id),nextShotId:text(nextShot?.id),anchors:{frame:text(sceneBlueprint?.continuity?.anchorFrame),location:text(sceneBlueprint?.continuity?.locationAnchor),time:text(sceneBlueprint?.continuity?.timeAnchor),color:text(sceneBlueprint?.continuity?.colorProfile)},requirements:{preserveSubjectIdentity:subjects.length>0,matchPrevious:true,matchNext:Boolean(nextShot),matchColorAndLighting:true,originalOnly:true}};
}
export function validateGeneratedSceneContinuity(result,contract){
 if(!result) return {ok:false,reason:'missing-result'};
 if(contract?.requirements?.preserveSubjectIdentity && result.identityPreserved!==true)return {ok:false,reason:'subject-identity-not-confirmed'};
 if(contract?.requirements?.matchPrevious && result.continuity?.previousMatched!==true)return {ok:false,reason:'previous-shot-continuity-not-confirmed'};
 if(contract?.requirements?.matchNext && result.continuity?.nextMatched!==true)return {ok:false,reason:'next-shot-continuity-not-confirmed'};
 if(result.original!==true)return {ok:false,reason:'originality-not-confirmed'};
 return {ok:true};
}
