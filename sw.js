// Cache ismi ve versiyonu
const CACHE_NAME = 'vesikalik-cache-v1';

// Cache'lenecek dosyalar
const urlsToCache = [
    '/',
    '/index.html',
    '/css/main.css',
    '/js/app.js',
    '/js/core/config.js',
    '/js/core/events.js',
    '/js/core/storage.js',
    '/js/services/camera.js',
    '/js/services/photo.js',
    '/js/ui/camera.js',
    '/js/ui/gallery.js',
    '/js/ui/theme.js',
    '/js/ui/components/dialog.js',
    '/js/ui/components/toast.js',
    'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js'
];

// Service Worker Kurulumu
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache opened');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Cache installation failed:', error);
            })
    );
});

// Aktif Olma Durumu
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Stratejisi: Cache First, Network Fallback
self.addEventListener('fetch', event => {
    // POST isteklerini ve diğer özel istekleri normale bırak
    if (event.request.method !== 'GET') {
        return;
    }

    // CDN kaynaklarını kontrol et
    const isCDNRequest = event.request.url.includes('cdnjs.cloudflare.com') ||
        event.request.url.includes('cdn.jsdelivr.net');

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache'de varsa döndür
                if (response) {
                    return response;
                }

                // Cache'de yoksa network'den al
                return fetch(event.request).then(networkResponse => {
                    // CDN kaynakları veya başarısız istekler için cache'leme yapma
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Cache'e kopyala ve response'u döndür
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return networkResponse;
                });
            })
            .catch(() => {
                // Offline durumda ve cache'de yoksa
                return new Response('Offline mode: Resource not available', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});

// Push Notification Handler
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: 'icons/icon-192x192.png',
            badge: 'icons/badge-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});