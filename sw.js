const CACHE_NAME = 'toro-v51'; // Sube la versión cada que hagas cambios grandes
const assets = [
  './',
  './index.html',
  './styles/style.css',
  './assets/logo_toro.png',
  './manifest.json'
];

// Instalación
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
  self.skipWaiting();
});

// Activación (Limpia cachés viejos)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

// ESTRATEGIA: NETWORK FIRST (Ideal para desarrollo y actualización rápida)
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(networkResponse => {
        // Si hay red, guardamos la copia nueva en el caché y devolvemos la respuesta
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // SI NO HAY RED (Modo Offline), buscamos en el caché
        return caches.match(e.request).then(cacheResponse => {
          return cacheResponse || caches.match('./index.html');
        });
      })
  );
});