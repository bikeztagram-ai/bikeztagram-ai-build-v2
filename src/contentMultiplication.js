/* One creative project -> coordinated versions, clips and stills. */
const OUTPUTS = Object.freeze(['hero','teaser','vertical','square','social-clips','thumbnail']);
export function buildContentMultiplication(project={}, requested=OUTPUTS) {
  const formats=Array.isArray(requested)&&requested.length?requested:OUTPUTS;
  return { version:1, sourceProjectId:project.id||null, outputs:formats.map((format,index)=>({id:`output-${index+1}`,format,source:project.id||null,status:'planned',derivation:'shared-creative-dna'})) };
}
