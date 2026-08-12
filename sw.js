/* El HTML nunca se sirve de caché: una app de un solo archivo que se
   actualiza a diario no puede quedarse pegada a una copia vieja. La caché
   queda para los iconos y el manifiesto, que sí son estables. */
const CACHE = 'sol-fitness-v10';
const BASE = '/fitness-app';
const ASSETS = [
  BASE + '/manifest.json',
  BASE + '/icons/icon-180.png',
  BASE + '/icons/icon-192.png',
  BASE + '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  const url = new URL(e.request.url);
  const esHtml = e.request.mode === 'navigate' ||
    url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  // HTML, JS y CSS: siempre de la red, con la caché solo como red de
  // seguridad si no hay conexión.
  if (esHtml || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
