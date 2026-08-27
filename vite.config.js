import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function copyFfmpegAssets() {
  return {
    name: 'copy-ffmpeg-assets',
    buildStart() {
      const src = path.resolve('node_modules/@ffmpeg/core/dist/esm');
      const dest = path.resolve('public/ffmpeg');
      fs.mkdirSync(dest, { recursive: true });
      for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js']) {
        const from = path.join(src, file);
        if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dest, file));
      }
    }
  };
}

function guardBlobClientUpload() {
  return {
    name: 'guard-blob-client-upload',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/App.jsx')) return null;
      const target = "import {upload} from '@vercel/blob/client';";
      if (!code.includes(target)) return null;
      return {
        code: code.replace(
          target,
          "import {uploadWithIdleTimeout as upload} from './blobUploadPolicy.js';"
        ),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [guardBlobClientUpload(), react(), copyFfmpegAssets()],
  base: './',
  server: { host: true, headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } },
  preview: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } },
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] }
});
