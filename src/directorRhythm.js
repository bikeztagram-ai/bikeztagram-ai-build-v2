const text=value=>String(value??'').toLowerCase();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function family(cut={}){
  const value=text([cut.shotType,cut.shotFamily,cut.framing,cut.purpose,cut.description].join(' '));
  if(/macro|extreme close|detail|insert/.test(value))return'detail';
  if(/close|portrait|face/.test(value))return'close';
  if(/wide|establish|landscape|aerial|drone/.test(value))return'wide';
  if(/action|tracking|chase|race|movement|speed/.test(value))return'action';
  if(/overhead|top-down|bird/.test(value))return'overhead';
  return'general';
}

function role(cut,index,total){
  const explicit=text(cut?.role||cut?.editorialRole||cut?.purpose);
  if(explicit)return explicit;
  if(index===0)return'hook';
  if(index===total-1)return'hero';
  return'build';
}

export function analyseDirectorRhythm(cuts=[]){
  const items=Array.isArray(cuts)?cuts:[];
  if(!items.length)return{score:0,shotFamilyVariety:0,roleVariety:0,repeatedFamilies:0,repeatedRoles:0,issues:['empty-timeline']};
  const families=items.map(family);
  const roles=items.map((cut,index)=>role(cut,index,items.length));
  const uniqueFamilies=new Set(families).size;
  const uniqueRoles=new Set(roles).size;
  let repeatedFamilies=0;let repeatedRoles=0;
  for(let i=1;i<families.length;i+=1){if(families[i]===families[i-1])repeatedFamilies+=1;if(roles[i]===roles[i-1])repeatedRoles+=1;}
  const familyVariety=uniqueFamilies/Math.max(1,Math.min(items.length,4));
  const roleVariety=uniqueRoles/Math.max(1,Math.min(items.length,4));
  const score=clamp(Math.round(55+familyVariety*20+roleVariety*15-repeatedFamilies*8-repeatedRoles*5),0,100);
  const issues=[];
  if(repeatedFamilies>=2)issues.push('repeated-shot-family');
  if(repeatedRoles>=2)issues.push('repeated-editorial-role');
  if(items.length>=3&&!roles.includes('hook'))issues.push('missing-hook');
  if(items.length>=3&&!roles.includes('hero')&&!roles.includes('hero-ending'))issues.push('missing-hero');
  return{score,shotFamilyVariety:Number(familyVariety.toFixed(2)),roleVariety:Number(roleVariety.toFixed(2)),repeatedFamilies,repeatedRoles,issues};
}

export function applyRhythmQuality(cuts=[]){
  const analysis=analyseDirectorRhythm(cuts);
  return{cuts,analysis};
}
