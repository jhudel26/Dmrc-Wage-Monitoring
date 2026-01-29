// Force cache busting script
// This will be called to clear all caches and refresh
if ('caches' in window) {
  caches.keys().then(function(names) {
    names.forEach(function(name) {
      caches.delete(name);
    });
  });
}

// Clear service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    registrations.forEach(function(reg) {
      reg.unregister();
    });
  });
}

// Force page reload
// `reload(true)` is deprecated and ignored by modern browsers.
window.location.reload();
