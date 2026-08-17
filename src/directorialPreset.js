const PRESETS={cinematic:{cut:.35,motion:.4,transition:.2},aggressive:{cut:.8,motion:.85,transition:.8},luxury:{cut:.25,motion:.2,transition:.15},documentary:{cut:.2,motion:.25,transition:.1},social:{cut:.75,motion:.7,transition:.65}};
export function resolveDirectorialPreset(name='cinematic',overrides={}){const base=PRESETS[name]||PRESETS.cinematic;return {...base,...overrides,name};}
