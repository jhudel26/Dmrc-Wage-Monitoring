// Global debug gate for noisy console.log statements.
// Enable by adding `?debug=1` to the URL or setting `localStorage.debug = 'true'`.
(function () {
  try {
    const params = new URLSearchParams(window.location.search);
    const enabled =
      params.get('debug') === '1' ||
      params.get('debug') === 'true' ||
      localStorage.getItem('debug') === 'true';

    window.DEBUG = enabled;
    if (enabled) return;

    // Silence console.log only (keep warn/error for troubleshooting).
    if (typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log = function () {};
    }
  } catch (e) {
    // If anything goes wrong, do nothing; never break the app.
  }
})();
