const CACHE_NAME = 'consumo-pwa-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/estilos.css',
  './js/app.js',
  './js/auth.js',
  './js/firebase-data.js',
  './js/firebase-config.js',
  './data/datos.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => {
      if(k !== CACHE_NAME) return caches.delete(k);
    })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
      if(!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return resp;
    }).catch(()=>caches.match('./')))
  );
});
