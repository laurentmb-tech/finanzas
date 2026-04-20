const CACHE_NAME = 'finanzas-v9-cache-v1';
const ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

// Instalar y cachear recursos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activar y limpiar cachés viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia: Network first, cache fallback
// Para Sheets/Google APIs: solo network, nunca cachear
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // No cachear llamadas a Google Sheets ni APIs externas
  if (url.includes('script.google.com') ||
      url.includes('googleapis.com') ||
      url.includes('finnhub.io')) {
    return; // dejar pasar sin interceptar
  }

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        // Si la respuesta es buena, actualizar caché
        if (resp && resp.status === 200) {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, respClone));
        }
        return resp;
      })
      .catch(() => {
        // Sin internet: servir desde caché
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Si es el index.html, servir la versión cacheada
          if (url.includes('laurentmb-tech.github.io')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Escuchar mensajes para forzar actualización
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
