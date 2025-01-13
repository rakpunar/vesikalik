const CACHE_NAME = 'vesikalik-v1.0.26';
const ASSETS = [
    '/vesikalik/',
    '/vesikalik/index.html',
    '/vesikalik/styles.css',
    '/vesikalik/js/main.js',
    '/vesikalik/js/camera.js',
    '/vesikalik/js/gallery.js',
    '/vesikalik/js/storage.js',
    '/vesikalik/js/dialog.js',
    '/vesikalik/js/toast.js',
    '/vesikalik/js/debug.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js'
];

// Service Worker Kurulumu
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

// Önbellek Stratejisi: Network First, Cache Fallback
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// Share Target API
self.addEventListener('fetch', (event) => {
    if (event.request.url.endsWith('/share-target/')) {
        event.respondWith((async () => {
            const formData = await event.request.formData();
            const photos = formData.getAll('photos');

            // Paylaşılan fotoğrafları işle
            for (const photo of photos) {
                const photoData = await photo.arrayBuffer();
                // IndexedDB'ye kaydet
                // Bu kısmı daha sonra implement edeceğiz
            }

            // Kullanıcıyı ana sayfaya yönlendir
            return Response.redirect('/vesikalik/pwa-example/', 303);
        })());
    }
}); 
