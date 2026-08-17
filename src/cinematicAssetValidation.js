/* BIKEZTAGRAM AI — reference asset validation. £0-only. */
export function validateCinematicAssets(assets = []) {
  const errors = [];
  if (!Array.isArray(assets)) return { valid: false, errors: ['Reference assets must be an array.'] };
  assets.forEach((asset, index) => {
    if (!asset || typeof asset !== 'object') errors.push(`Asset ${index + 1} is invalid.`);
    else if (!asset.url && !asset.path && !asset.blob) errors.push(`Asset ${index + 1} has no usable source.`);
  });
  return { valid: errors.length === 0, errors };
}
