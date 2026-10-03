#!/usr/bin/env node
import fs from 'node:fs';

const exportFile = fs.readFileSync('src/socialExport.js', 'utf8');
const presetFile = fs.readFileSync('src/outputPresets.js', 'utf8');
const checks = {
  socialExportModuleExists: exportFile.length > 0,
  hasDownloadPath: exportFile.includes('downloadSocialFilm'),
  hasSharePath: exportFile.includes('shareSocialFilm'),
  hasExportInfo: exportFile.includes('getSocialExportInfo'),
  hasOutputPresetDependency: exportFile.includes("from './outputPresets.js'") && exportFile.includes('OUTPUT_PRESETS'),
  hasVerticalProfile: presetFile.includes('portrait') && presetFile.includes('9:16'),
  hasSquareProfile: presetFile.includes('square') && presetFile.includes('1:1'),
  hasLandscapeProfile: presetFile.includes('landscape') && presetFile.includes('16:9')
};
const failed = Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({status: failed.length ? 'failed' : 'passed', checks, failed, generatedAt:new Date().toISOString()}, null, 2));
if (failed.length) process.exit(2);
