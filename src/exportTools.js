/* BIKEZTAGRAM AI — browser export + QA presentation layer.
   This layer does not alter Blob upload, Gemini, analysis, or renderer behaviour.
   It adds a reliable download action for locally rendered Blob URLs and exposes
   the automatic browser-QA result beside the rendered video.
*/

function fileNameFor(video) {
  const source = String(video?.src || video?.currentSrc || '').toLowerCase();
  return source.includes('mp4') ? 'bikeztagram-ai-edit.mp4' : 'bikeztagram-ai-edit.webm';
}

function addExportControls(video) {
  if (!(video instanceof HTMLVideoElement) || video.dataset.bikeztagramExportReady === '1') return;
  const src = video.currentSrc || video.src || '';
  if (!src.startsWith('blob:')) return;

  video.dataset.bikeztagramExportReady = '1';
  const wrapper = document.createElement('div');
  wrapper.dataset.bikeztagramExportControls = '1';
  wrapper.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-top:12px;align-items:stretch;';

  const download = document.createElement('a');
  download.href = src;
  download.download = fileNameFor(video);
  download.textContent = '⬇️ Download video';
  download.setAttribute('aria-label', 'Download Bikeztagram AI rendered video');
  download.style.cssText = 'display:block;text-align:center;text-decoration:none;padding:12px 16px;border-radius:8px;background:#1687ff;color:#fff;font-weight:700;cursor:pointer;';

  const qa = document.createElement('div');
  qa.style.cssText = 'font-size:12px;opacity:.82;text-align:left;padding:10px;border:1px solid rgba(255,255,255,.14);border-radius:8px;';
  qa.textContent = '🔎 Automatic render QA running…';

  wrapper.append(download, qa);
  video.insertAdjacentElement('afterend', wrapper);

  const updateQA = () => {
    const report = window.__bikeztagramLastAutoQA;
    if (!report) return false;
    const passed = report.verdict === 'PASS';
    qa.textContent = `${passed ? '✅' : '⚠️'} Render QA: ${report.verdict} • ${Number(report.durationSeconds || 0).toFixed(2)}s • ${report.width || 0}×${report.height || 0} • playback ${report.playbackAdvanced ? 'OK' : 'FAILED'}`;
    return true;
  };

  if (!updateQA()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (updateQA() || attempts >= 20) clearInterval(timer);
    }, 500);
  }
}

function installExportObserver() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  if (window.__bikeztagramExportToolsInstalled) return;
  window.__bikeztagramExportToolsInstalled = true;

  const scan = (root) => {
    if (root instanceof HTMLVideoElement) addExportControls(root);
    if (root?.querySelectorAll) root.querySelectorAll('video').forEach(addExportControls);
  };

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach(scan));
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.querySelectorAll('video').forEach(addExportControls);
}

installExportObserver();
