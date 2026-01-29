// Service Worker for Wage Rates Notifications
const CACHE_NAME = 'wage-rates-v2.0.1';
const NOTIFICATION_TAG = 'wage-update';
const APP_VERSION = '2.0.1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Use relative URLs so this works when hosted in a subfolder.
      // Best-effort caching to avoid install failing if any asset is missing.
      const urlsToCache = [
        './',
        './index.html',
        './css/styles.css',
        `./js/utils.js?v=${APP_VERSION}`,
        `./js/app.js?v=${APP_VERSION}`
      ];

      await Promise.allSettled(urlsToCache.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      );
      await self.clients.claim();
    })()
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip caching for API calls and dynamic content
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('firebase') ||
      event.request.url.includes('.json')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Force network fetch for utils.js to bypass cache
  if (event.request.url.includes('utils.js')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Always fetch fresh version for HTML files
      if (event.request.url.endsWith('.html')) {
        return fetch(event.request);
      }
      return response || fetch(event.request);
    })
  );
});

// Handle background notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Focus or open the application
  event.waitUntil(
    (async () => {
      const appUrl = self.registration.scope; // Works for subfolder hosting
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of clientList) {
        if (client.url.startsWith(appUrl) && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(appUrl);
      }
      return undefined;
    })()
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Push event for future push notifications
self.addEventListener('push', (event) => {
  console.log('Push message received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Wage data has been updated',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💰</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💰</text></svg>',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Updates',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">👁️</text></svg>'
      },
      {
        action: 'close',
        title: 'Close',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">❌</text></svg>'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Wage Rates Updated', options)
  );
});
