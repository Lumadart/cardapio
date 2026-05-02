const CACHE_NAME = 'cardapio-v1.2'; // Atualizado para v1.2 para forçar o celular a baixar o novo código
const assets = [
  './',
  './index.html',
  './styles.css?v=1.1', // Certifique-se de que no index.html também esteja v=1.1
  './app.js?v=1.1',     // Certifique-se de que no index.html também esteja v=1.1
  './manifest.json',
  './icon.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// Instalação: Salva os arquivos no cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('PWA: Instalando novo cache ' + CACHE_NAME);
      return cache.addAll(assets);
    })
  );
  self.skipWaiting(); // Força o novo SW a assumir o controle imediatamente
});

// Ativação: Remove caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('PWA: Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Garante que o novo Service Worker controle todas as abas abertas imediatamente
  self.clients.claim();
});

// Estratégia de Fetch: Tenta o Cache, se não tiver, busca na Rede
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request);
    })
  );
});