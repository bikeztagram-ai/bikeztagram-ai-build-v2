#!/usr/bin/env node
import fs from 'node:fs';

const exportFile = fs.readFileSync('src/socialExport.js', 'utf8');
const checks = {
  socialExportModuleExists: exportFile.length > 0,
  hasDownloadPath: exportFile.includes('downloadSocialFilm'),
  hasSharePath: exportFile.includes('shareSocialFilm'),
  hasExportInfo: exportFile.includes('getSocialExportInfo'),
  hasVerticalProfile: exportFile.includes('9:16') || exportFile.includes('1080'),
  hasSquareProfile: exportFile.includes('1:1') || exportFile.includes('square'),
  hasLandscapeProfile: exportFile.includes('16:9') || exportFile.includes('landscape')
};
const failed = Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({status: failed.length ? 'failed' : 'passed', checks, failed, generatedAt:new Date().toISOString()}, null, 2));
if (failed.length) process.exit(2);
