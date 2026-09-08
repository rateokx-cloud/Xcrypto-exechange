// CryptoX Service Worker — PWA Support + Push Notifications
const CACHE_NAME = 'cryptox-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/converter.html',
  '/alerts.html',
  '/news.html',
  '/portfolio.html',
  '/css/style.css',
  '/js/data.js',
  '/js/auth.js',
  '/js/api.js',
  '/js/chart.js',
  '/js/main.js',
  '/js/alerts.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always fetch API calls from network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) {
    return;
  }

  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful GET responses for html/css/js
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => {
        if (cached) return cached;
        // Offline fallback for HTML pages
        if (e.request.headers.get('Accept') && e.request.headers.get('Accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      }))
  );
});

// Push notification from price alerts
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'PRICE_ALERT') {
    self.registration.showNotification(e.data.title || 'CryptoX Alert', {
      body: e.data.body || 'Price target reached!',
      icon: e.data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'price-alert-' + Date.now(),
      requireInteraction: false,
      actions: [
        { action: 'view', title: 'View Alerts' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }
});

// Notification click handler
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'view' || !e.action) {
    e.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        const alertsUrl = '/alerts.html';
        for (let client of windowClients) {
          if (client.url.includes('/alerts') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(alertsUrl);
      })
    );
  }
});

// Background sync (if supported)
self.addEventListener('sync', e => {
  if (e.tag === 'price-check') {
    // Could trigger background price check here
    console.log('[SW] Background sync: price-check');
  }
});
