const CACHE_NAME = 'cardapio-v1';
const assets = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});