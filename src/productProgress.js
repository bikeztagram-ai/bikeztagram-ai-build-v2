/* Product-level progress model. Percentages describe the requested end product, not isolated subsystems. */
export const PRODUCT_PROGRESS={
 universalMedia:85, visualIntelligence:80, editorialDirector:62, musicComposition:51,
 audioMixing:73, generation:15, conversationalEditing:20, autonomousProduction:55,
 renderer:67, qaRevision:75, export:65, persistence:40, mobileUX:55, copyrightSafety:57,
 productisation:10
};
export const PRODUCT_PROGRESS_VERSION='honest-product-v3';
export function calculateProductProgress(progress=PRODUCT_PROGRESS){const values=Object.values(progress);return Math.round(values.reduce((a,b)=>a+b,0)/values.length);}
