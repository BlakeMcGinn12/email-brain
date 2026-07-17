/* Cancel Safari page pinch-zoom when preventDefault cannot stop it.
 *
 * Modern iOS often ignores user-scalable=no. When the browser still page-zooms,
 * visualViewport.scale goes above 1 and the visual window pans (offsetLeft /
 * offsetTop). That looks like the screen sliding up-left with smeared content
 * revealed at the bottom-right.
 *
 * Strategy:
 *  1. Aggressively preventDefault on document touches (except the detail card).
 *  2. If page zoom still happens, counter-transform #app-shell so it stays
 *     glued to the visual viewport at apparent 1:1 (Chrome/WICG pattern).
 *  3. Surface a tiny on-screen debug readout when scale !== 1.
 */
(() => {
  const shell = document.getElementById('app-shell');
  const debugEl = document.getElementById('zoom-debug');
  const vv = window.visualViewport;
  if (!shell) return;

  function inDetailCard(target) {
    return target instanceof Element && Boolean(target.closest('.detail-card'));
  }

  // Kill native scroll/zoom for the whole app surface. Detail card keeps
  // manipulation so its link list can still scroll.
  function blockNative(e) {
    if (inDetailCard(e.target)) return;
    if (e.cancelable) e.preventDefault();
  }
  window.addEventListener('touchstart', blockNative, { passive: false, capture: true });
  window.addEventListener('touchmove', blockNative, { passive: false, capture: true });
  window.addEventListener('gesturestart', (e) => e.preventDefault(), { capture: true });
  window.addEventListener('gesturechange', (e) => e.preventDefault(), { capture: true });
  window.addEventListener('gestureend', (e) => e.preventDefault(), { capture: true });

  let pending = false;
  let lastLog = 0;

  function syncShellToVisualViewport() {
    if (!vv) {
      shell.style.transform = '';
      return;
    }

    const scale = vv.scale || 1;
    const ox = vv.offsetLeft || 0;
    const oy = vv.offsetTop || 0;

    // Inverse the browser zoom + follow the visual window.
    // Net result: app appears fixed to the phone screen at 1:1.
    shell.style.transformOrigin = '0 0';
    if (Math.abs(scale - 1) < 0.001 && Math.abs(ox) < 0.5 && Math.abs(oy) < 0.5) {
      shell.style.transform = '';
    } else {
      shell.style.transform = `translate(${ox}px, ${oy}px) scale(${1 / scale})`;
    }

    if (debugEl) {
      if (Math.abs(scale - 1) >= 0.01) {
        debugEl.classList.remove('hidden');
        debugEl.textContent = `pageZoom ${scale.toFixed(2)}  offset ${ox.toFixed(0)},${oy.toFixed(0)}`;
      } else {
        debugEl.classList.add('hidden');
        debugEl.textContent = '';
      }
    }

    const now = Date.now();
    if (Math.abs(scale - 1) >= 0.01 && now - lastLog > 200) {
      lastLog = now;
      console.log('PAGE ZOOM ACTIVE:', scale, ox, oy);
    }
  }

  function scheduleSync() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      syncShellToVisualViewport();
    });
  }

  if (vv) {
    vv.addEventListener('resize', scheduleSync);
    vv.addEventListener('scroll', scheduleSync);
  }
  window.addEventListener('resize', scheduleSync);
  // Poll as a safety net — some WebViews miss visualViewport events mid-gesture.
  setInterval(syncShellToVisualViewport, 100);
  syncShellToVisualViewport();
})();
