self.addEventListener('install', event => {
  self.skipWaiting();
  console.log('Service Worker installed');
});

self.addEventListener('activate', event => {
  console.log('Service Worker activated');
});

self.addEventListener('fetch', event => {
  // 簡單放行：讓網路請求照常發出
  event.respondWith(fetch(event.request));
});
