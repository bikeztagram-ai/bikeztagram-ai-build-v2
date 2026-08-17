const STYLES={cinematic:{energy:'cinematic',cutBias:.55,motion:.45,transition:.35},aggressive:{energy:'aggressive',cutBias:.9,motion:.85,transition:.8},luxury:{energy:'cinematic',cutBias:.4,motion:.35,transition:.25},documentary:{energy:'dynamic',cutBias:.35,motion:.3,transition:.2},social:{energy:'aggressive',cutBias:.8,motion:.7,transition:.65}};
export function getDirectorialStyle(name='cinematic',overrides={}){return {...(STYLES[name]||STYLES.cinematic),...overrides,name};}
export function listDirectorialStyles(){return Object.keys(STYLES);}
