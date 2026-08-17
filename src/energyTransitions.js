export function planEnergyTransitions(shots = [], energy = []) {
  return shots.map((shot, index) => ({
    ...shot,
    energyIn: energy[index]?.value ?? .5,
    transition: energy[index]?.value > .8 ? 'impact' : energy[index]?.value < .25 ? 'breath' : 'cut'
  }));
}
