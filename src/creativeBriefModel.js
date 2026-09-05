/* Universal creative brief normalization: provider-neutral semantic vocabulary. */
const text=v=>String(v??'').trim();
const pick=(s,terms,fallback='')=>terms.find(t=>s.includes(t))||fallback;
const inferList=(s,terms)=>terms.filter(t=>s.includes(t));
export function normalizeCreativeBrief(prompt='',options={}){
  const s=text(prompt).toLowerCase();
  const subject=pick(s,['motorcycle','car','truck','vehicle','robot','person','character','animal','creature','spaceship','building','city','landscape'],'subject');
  const setting=pick(s,['space','mars','desert','jungle','forest','ocean','underwater','city','street','mountain','castle','studio','warehouse'],'environment');
  const mood=pick(s,['horror','dark','romantic','dreamy','epic','funny','calm','aggressive','mysterious','nostalgic','futuristic'],'cinematic');
  const camera=pick(s,['fpv','drone','aerial','orbit','tracking','close-up','wide shot','macro','handheld','static'],'cinematic');
  const lighting=pick(s,['neon','moonlight','sunset','sunrise','golden hour','studio','volumetric','backlit'],'cinematic');
  const actions=inferList(s,['chase','race','drift','fight','fly','explode','walk','run','transform','reveal','discover','crash','dance','build','destroy','escape']);
  const style=pick(s,['anime','western','cyberpunk','sci-fi','fantasy','documentary','commercial','music video','trailer','noir','photorealistic','surreal'],'cinematic');
  const pace=pick(s,['fast','slow','calm','rapid','energetic'],'cinematic');
  const aspectRatio=options.aspectRatio||pick(s,['9:16','16:9','1:1','2.39:1'],'portrait');
  return {subject,setting,mood,camera,lighting,actions,style,pace,aspectRatio,raw:text(prompt)};
}
