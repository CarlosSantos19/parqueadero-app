const CACHE_NAME = 'parqueadero-v1.0.0';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache install failed:', error);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests for real-time data
  if (event.request.url.includes('/api/')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              // Cache the fetched response
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // If network fails, try to serve offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-access-log') {
    event.waitUntil(
      // Process queued access logs when back online
      syncAccessLogs()
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    title: data.title || 'Sistema de Parqueadero',
    body: data.body || 'Nueva notificación',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Descartar',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function to sync access logs
async function syncAccessLogs() {
  try {
    // Get queued logs from IndexedDB or localStorage
    const queuedLogs = await getQueuedAccessLogs();
    
    for (const log of queuedLogs) {
      try {
        const response = await fetch('/api/access/entry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${log.token}`
          },
          body: JSON.stringify(log.data)
        });
        
        if (response.ok) {
          // Remove from queue
          await removeQueuedLog(log.id);
          console.log('Synced access log:', log.id);
        }
      } catch (error) {
        console.error('Failed to sync log:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Placeholder functions for queue management
async function getQueuedAccessLogs() {
  // Implementation would use IndexedDB
  return [];
}

async function removeQueuedLog(id) {
  // Implementation would use IndexedDB
  console.log('Remove queued log:', id);
}