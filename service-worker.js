/* 台股損益管理 PWA Service Worker */
const CACHE_VERSION = 'stock-tracker-pwa-v21-20260517-history-cash-readable';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './rise-logo-red-16.png',
  './rise-logo-red-32.png',
  './rise-logo-red-48.png',
  './rise-logo-red-64.png',
  './rise-logo-red-180.png',
  './rise-logo-red-192.png',
  './rise-logo-red-512.png',
  './rise-logo-red.svg',
  './app.js',
  './services/storageService.js',
  './services/saveStatusService.js',
  './services/stockCategoryService.js',
  './services/tradeService.js',
  './services/cashService.js',
  './services/priceService.js',
  './services/institutionalOiService.js',
  './services/chipService.js',
  './services/stockRiskService.js',
  './services/backupService.js',
  './taiwan_hot_stock_category_database_2026.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith('stock-tracker-pwa-') && !key.startsWith(CACHE_VERSION))
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 單頁應用：離線重新整理時回傳 index.html。
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request).catch(() => caches.match('./index.html')));
    return;
  }

  // Netlify functions / 行情資料：優先網路，離線時才用舊快取。
  if (url.pathname.includes('/.netlify/functions/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // JS / CSS / 圖示 / CDN：優先快取，讓 App 可以離線啟動。
  if (['script', 'style', 'image', 'font'].includes(request.destination) || url.origin !== self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request).catch(() => caches.match(request)));
});
