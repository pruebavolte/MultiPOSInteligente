// Service Worker para PWA - System International
// Version: 2.0.0 - Full PWA Capabilities

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-cache-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/si-icon-192.png',
  '/icons/si-icon-512.png',
  '/icons/si-icon-512-maskable.png',
  '/images/dashboard.png',
  '/images/dashboard1.png',
  '/offline.html'
];

// Cache strategies
const CACHE_STRATEGIES = {
  cacheFirst: ['icons', 'images', 'fonts', 'css'],
  networkFirst: ['api', 'dashboard', 'login'],
  staleWhileRevalidate: ['js', 'json']
};

// ===== INSTALL EVENT =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('static-cache-') && cacheName !== STATIC_CACHE ||
                     cacheName.startsWith('dynamic-cache-') && cacheName !== DYNAMIC_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// ===== FETCH EVENT - Main caching logic =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Determine cache strategy based on request type
  const strategy = getCacheStrategy(url.pathname);

  event.respondWith(handleFetch(request, strategy));
});

function getCacheStrategy(pathname) {
  if (pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i) || 
      pathname.startsWith('/icons/') || 
      pathname.startsWith('/images/')) {
    return 'cacheFirst';
  }
  if (pathname.match(/\.(css|woff|woff2|ttf|eot)$/i)) {
    return 'cacheFirst';
  }
  if (pathname.startsWith('/api/')) {
    return 'networkFirst';
  }
  if (pathname.match(/\.(js|json)$/i)) {
    return 'staleWhileRevalidate';
  }
  return 'networkFirst';
}

async function handleFetch(request, strategy) {
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request);
    case 'networkFirst':
      return networkFirst(request);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request);
    default:
      return networkFirst(request);
  }
}

// Cache First Strategy - for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network First Strategy - for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      caches.open(DYNAMIC_CACHE).then((cache) => {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  }).catch(() => null);

  return cachedResponse || fetchPromise || new Response('Offline', { status: 503 });
}

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync triggered:', event.tag);
  
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncSales());
  }
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
  if (event.tag === 'sync-data') {
    event.waitUntil(syncAllData());
  }
});

async function syncSales() {
  console.log('[SW] Syncing sales data...');
  try {
    const db = await openIndexedDB();
    const pendingSales = await getFromDB(db, 'pendingSales');
    
    for (const sale of pendingSales) {
      try {
        await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale)
        });
        await removeFromDB(db, 'pendingSales', sale.id);
      } catch (error) {
        console.error('[SW] Failed to sync sale:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync sales failed:', error);
  }
}

async function syncOrders() {
  console.log('[SW] Syncing orders data...');
  try {
    const db = await openIndexedDB();
    const pendingOrders = await getFromDB(db, 'pendingOrders');
    
    for (const order of pendingOrders) {
      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order)
        });
        await removeFromDB(db, 'pendingOrders', order.id);
      } catch (error) {
        console.error('[SW] Failed to sync order:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync orders failed:', error);
  }
}

async function syncAllData() {
  await syncSales();
  await syncOrders();
}

// ===== PERIODIC BACKGROUND SYNC =====
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic Sync triggered:', event.tag);
  
  if (event.tag === 'update-products') {
    event.waitUntil(updateProductsCache());
  }
  if (event.tag === 'update-categories') {
    event.waitUntil(updateCategoriesCache());
  }
  if (event.tag === 'sync-inventory') {
    event.waitUntil(syncInventory());
  }
});

async function updateProductsCache() {
  console.log('[SW] Updating products cache...');
  try {
    const response = await fetch('/api/products');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/api/products', response);
      console.log('[SW] Products cache updated');
    }
  } catch (error) {
    console.error('[SW] Failed to update products cache:', error);
  }
}

async function updateCategoriesCache() {
  console.log('[SW] Updating categories cache...');
  try {
    const response = await fetch('/api/categories');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/api/categories', response);
      console.log('[SW] Categories cache updated');
    }
  } catch (error) {
    console.error('[SW] Failed to update categories cache:', error);
  }
}

async function syncInventory() {
  console.log('[SW] Syncing inventory...');
  try {
    const response = await fetch('/api/ingredients/stock');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/api/ingredients/stock', response);
    }
  } catch (error) {
    console.error('[SW] Failed to sync inventory:', error);
  }
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'System International POS',
    body: 'Tienes una nueva notificación',
    icon: '/icons/si-icon-192.png',
    badge: '/icons/si-icon-192.png',
    tag: 'general',
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Cerrar' }
    ],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// ===== MESSAGE HANDLING =====
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// ===== SHARE TARGET HANDLING =====
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  const formData = await request.formData();
  const title = formData.get('title') || '';
  const text = formData.get('text') || '';
  const url = formData.get('url') || '';
  const files = formData.getAll('files');

  // Store shared data in IndexedDB or cache
  const sharedData = { title, text, url, files: files.map(f => f.name), timestamp: Date.now() };
  
  try {
    const db = await openIndexedDB();
    await addToDB(db, 'sharedData', sharedData);
  } catch (error) {
    console.error('[SW] Failed to store shared data:', error);
  }

  // Redirect to dashboard with shared data
  return Response.redirect(`/dashboard?shared=true&title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}`);
}

// ===== INDEXEDDB HELPERS =====
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SystemIntlDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pendingSales')) {
        db.createObjectStore('pendingSales', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pendingOrders')) {
        db.createObjectStore('pendingOrders', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('sharedData')) {
        db.createObjectStore('sharedData', { keyPath: 'timestamp' });
      }
    };
  });
}

function getFromDB(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function addToDB(db, storeName, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(data);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removeFromDB(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ===== ONLINE/OFFLINE STATUS =====
self.addEventListener('online', () => {
  console.log('[SW] App is online');
  // Trigger sync when back online
  self.registration.sync.register('sync-data').catch(console.error);
});

self.addEventListener('offline', () => {
  console.log('[SW] App is offline');
});

console.log('[SW] Service Worker loaded - Version 2.0.0');
