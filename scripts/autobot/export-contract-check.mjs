#!/usr/bin/env node
import fs from 'node:fs';

const exportFile = fs.readFileSync('src/socialExport.js', 'utf8');
const presetFile = fs.readFileSync('src/outputPresets.js', 'utf8');
const checks = {
  socialExportModuleExists: exportFile.length > 0,
  hasDownloadPath: exportFile.includes('downloadSocialFilm'),
  hasSharePath: exportFile.includes('shareSocialFilm'),
  hasExportInfo: exportFile.includes('getSocialExportInfo'),
  hasValidationPath: exportFile.includes('validateSocialExport'),
  hasVerticalProfile: /portrait[\s\S]*9:16/.test(presetFile),
  hasSquareProfile: /square[\s\S]*1:1/.test(presetFile),
  hasLandscapeProfile: /landscape[\s\S]*16:9/.test(presetFile),
  hasDeterministicDimensions: /portrait[\s\S]*width:1080[\s\S]*height:1920/.test(presetFile) && /landscape[\s\S]*width:1920[\s\S]*height:1080/.test(presetFile)
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ status: failed.length ? 'failed' : 'passed', checks, failed, generatedAt: new Date().toISOString() }, null, 2));
if (failed.length) process.exit(2);
