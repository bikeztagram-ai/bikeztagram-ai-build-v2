/* Product-level progress model. Percentages describe the requested end product, not isolated subsystems. */
export const PRODUCT_PROGRESS={
 universalMedia:85, visualIntelligence:80, editorialDirector:62, musicComposition:35,
 audioMixing:70, generation:15, conversationalEditing:20, autonomousProduction:55,
 renderer:65, qaRevision:70, export:65, persistence:40, mobileUX:55, copyrightSafety:55,
 productisation:10
};
export const PRODUCT_PROGRESS_VERSION='honest-product-v2';
export function calculateProductProgress(progress=PRODUCT_PROGRESS){const values=Object.values(progress);return Math.round(values.reduce((a,b)=>a+b,0)/values.length);}
