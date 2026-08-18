const CACHE_NAME = 'av-command-v1';

// Aktifkan mesin secara instan saat pertama kali install
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); 
});

// STRATEGI: NETWORK FIRST (Prioritas Server)
// Mesin akan selalu mencari kode terbaru dari GitHub. Jika HP tidak ada sinyal, baru memuat dari Cache.
self.addEventListener('fetch', (event) => {
    // Abaikan request dari Google Apps Script agar tidak nyangkut di memori
    if (event.request.url.includes("script.google.com")) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Jika sukses mendownload kode baru, simpan ke memori HP
                const resClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, resClone);
                });
                return response;
            })
            .catch(() => {
                // Jika sinyal mati, ambil dari memori HP
                return caches.match(event.request);
            })
    );
});
